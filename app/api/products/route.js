import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { haversineDistance, findSellersInRadius } from '@/app/api/utils/haversine';

const prisma = new PrismaClient();

/**
 * Get all products - if user location is provided, filter by nearby sellers
 */
export async function GET(request) {
  console.log('Products API called');
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Get user location from query params
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = parseFloat(searchParams.get('radius') || '3'); // Default 3km
    const category = searchParams.get('category'); // Optional category filter
    const sellerId = searchParams.get('sellerId'); // Add sellerId parameter
    
    console.log('Filter parameters:', { latitude, longitude, radius, category, sellerId });
    
    // Check if we need to filter by location
    const hasLocationFilter = !isNaN(latitude) && !isNaN(longitude);
    
    // If we have location coordinates, get nearby sellers first
    let sellerFilter = {};
    
    // Check if sellerId is provided - this takes precedence over location filtering
    if (sellerId) {
      console.log(`Filtering by specific seller ID: ${sellerId}`);
      sellerFilter = {
        sellerId: sellerId
      };
    } else if (hasLocationFilter) {
      console.log('Filtering sellers by location');
      
      // Get all sellers with coordinates
      const sellers = await prisma.seller.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
        },
      });
      
      console.log(`Found ${sellers.length} sellers with coordinates`);
      
      // Find sellers within radius
      const nearbySellers = findSellersInRadius(sellers, latitude, longitude, radius);
      
      console.log(`Found ${nearbySellers.length} sellers within ${radius}km`);
      
      // If no nearby sellers, return empty result
      if (nearbySellers.length === 0) {
        return NextResponse.json({
          products: [],
          message: "No nearby sellers found within radius",
          locationUsed: true,
          sellersFound: 0,
        });
      }
      
      // Get the IDs of nearby sellers for the product query
      const nearbySellerIds = nearbySellers.map(seller => seller.id);
      
      // Build location filter
      sellerFilter = {
        sellerId: {
          in: nearbySellerIds,
        },
      };
    } else {
      console.log('No location filter provided, returning all products');
    }
    
    // Build category filter if provided
    const categoryFilter = category ? {
      category: {
        equals: category,
        mode: 'insensitive', // Case insensitive search
      },
    } : {};
    
    // Combine all filters
    const whereClause = {
      isActive: true, // Only active products
      ...sellerFilter,
      ...categoryFilter,
    };
    
    // If no sellerId and no location filter, return only products from visible sellers
    if (!sellerId && !hasLocationFilter) {
      // Get IDs of visible sellers
      const visibleSellers = await prisma.seller.findMany({
        where: { isVisible: true },
        select: { id: true },
      });
      const visibleSellerIds = visibleSellers.map(s => s.id);
      
      // Add visible sellers filter
      whereClause.sellerId = { in: visibleSellerIds };
      console.log(`Restricting to ${visibleSellerIds.length} visible sellers`);
    }
    
    console.log('Final query filter:', JSON.stringify(whereClause));
    
    // Get products with combined filters
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
          },
        },
        colorInventory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`Found ${products.length} products within criteria`);
    
    // If we applied location filter, add distance to each product
    if (hasLocationFilter) {
      products.forEach(product => {
        if (product.seller?.latitude && product.seller?.longitude) {
          product.distance = haversineDistance(
            latitude,
            longitude,
            product.seller.latitude,
            product.seller.longitude
          );
        }
      });
    }

    // Process products to ensure they have all required fields
    const processedProducts = products.map(product => {
      // Extract seller data while removing sensitive fields
      const { seller, ...productData } = product;
      
      // Get important seller info without sensitive data
      const sellerInfo = seller ? {
        sellerId: seller.id,
        shopName: seller.shopName || 'Unknown Shop',
        city: seller.city,
        state: seller.state,
        // Include distance if available
        ...(product.distance !== undefined ? { distance: product.distance } : {})
      } : null;
      
      // Return a clean product object with all required fields
      return {
        ...productData,
        // Add back the seller info we want to keep
        seller: sellerInfo,
        // Ensure these critical fields are always present with fallbacks
        id: productData.id,
        name: productData.name || 'Unnamed Product',
        description: productData.description || '',
        sellingPrice: typeof productData.sellingPrice === 'number' ? productData.sellingPrice : 0,
        mrpPrice: typeof productData.mrpPrice === 'number' ? productData.mrpPrice : 0,
        discountPercentage: productData.mrpPrice && productData.sellingPrice
          ? Math.round(100 - ((productData.sellingPrice / productData.mrpPrice) * 100))
          : 0,
        category: productData.category || 'General',
        subcategory: productData.subcategory || '',
        // Ensure images is always a valid array of URLs
        images: Array.isArray(productData.images) 
          ? productData.images.filter(img => img && typeof img === 'string')
          : [],
        // Include any other fields needed by ProductCard
        sizeQuantities: productData.sizeQuantities || {},
        isActive: productData.isActive !== false, // Default to true if undefined
        createdAt: productData.createdAt || new Date().toISOString(),
      };
    });
    
    // Debug log the first processed product
    if (processedProducts.length > 0) {
      console.log('First processed product sample:', {
        id: processedProducts[0].id,
        name: processedProducts[0].name,
        hasImages: Array.isArray(processedProducts[0].images) && processedProducts[0].images.length > 0,
        hasPrice: processedProducts[0].sellingPrice !== undefined,
        imageCount: Array.isArray(processedProducts[0].images) ? processedProducts[0].images.length : 0
      });
    }
    
    return NextResponse.json({
      products: processedProducts,
      locationUsed: hasLocationFilter,
      sellersFound: hasLocationFilter ? sellerFilter.sellerId.in.length : null,
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message },
      { status: 500 }
    );
  }
} 