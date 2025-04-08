import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

/**
 * Get all products - if user location is provided, filter by nearby sellers using PostGIS
 */
export async function GET(request) {
  console.log('Products API called');
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Get user location from query params
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = Math.min(parseFloat(searchParams.get('radius') || '3'), 3); // Default and max 3km
    const category = searchParams.get('category'); // Optional category filter
    const sellerId = searchParams.get('sellerId'); // Add sellerId parameter
    
    console.log('Filter parameters:', { latitude, longitude, radius, category, sellerId });
    
    // Check if we need to filter by location
    const hasLocationFilter = !isNaN(latitude) && !isNaN(longitude);
    
    let whereClause = {
      isActive: true
    };

    // Check if sellerId is provided - this takes precedence over location filtering
    if (sellerId) {
      console.log(`Filtering by specific seller ID: ${sellerId}`);
      whereClause.sellerId = sellerId;
    } else if (hasLocationFilter) {
      console.log('Filtering sellers by location using PostGIS');
      
      // Get nearby seller IDs using PostGIS
      const nearbySellers = await prisma.$queryRaw`
        SELECT id, distance 
        FROM find_nearby_sellers(
          ${latitude}::float8,
          ${longitude}::float8,
          ${radius}::float8,
          NULL
        )
      `;
      
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
      console.log(`Found ${nearbySellerIds.length} sellers within ${radius}km`);
      
      // Create a Map for quick distance lookups
      const sellerDistances = new Map(
        nearbySellers.map(seller => [seller.id, seller.distance])
      );
      
      whereClause.sellerId = {
        in: nearbySellerIds,
      };
    } else {
      console.log('No location filter provided, returning products from visible sellers only');
      // Get IDs of visible sellers
      const visibleSellers = await prisma.seller.findMany({
        where: { isVisible: true },
        select: { id: true },
      });
      whereClause.sellerId = { in: visibleSellers.map(s => s.id) };
    }
    
    // Add category filter if provided
    if (category) {
      whereClause.category = {
        equals: category,
        mode: 'insensitive',
      };
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
    
    return NextResponse.json({
      products,
      total: products.length,
      locationUsed: hasLocationFilter,
      sellersFound: hasLocationFilter ? whereClause.sellerId.in.length : null,
    });
    
  } catch (error) {
    console.error('Error in products endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 