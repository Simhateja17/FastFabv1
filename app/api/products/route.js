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
    
    console.log('Location filter parameters:', { latitude, longitude, radius, category });
    
    // Check if we need to filter by location
    const hasLocationFilter = !isNaN(latitude) && !isNaN(longitude);
    
    // If we have location coordinates, get nearby sellers first
    let sellerFilter = {};
    
    if (hasLocationFilter) {
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
    
    return NextResponse.json({
      products,
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