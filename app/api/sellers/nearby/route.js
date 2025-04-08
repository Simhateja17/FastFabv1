import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

/**
 * Get sellers near a specific location using PostGIS spatial queries
 */
export async function GET(request) {
  console.log('Nearby Sellers API called (PostGIS implementation)');
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Get location parameters
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = Math.min(parseFloat(searchParams.get('radius') || '3'), 3); // Default and max 3km
    const categories = searchParams.get('categories')?.split(',').filter(Boolean);
    
    console.log('Search parameters:', { latitude, longitude, radius, categories });
    
    // Validate required parameters
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters', 
          details: 'Valid latitude and longitude are required' 
        },
        { status: 400 }
      );
    }

    // Use PostGIS function to find nearby sellers
    const nearbySellers = await prisma.$queryRaw`
      SELECT * FROM find_nearby_sellers(
        ${latitude}::float8,
        ${longitude}::float8,
        ${radius}::float8,
        ${categories ? categories : null}
      )
    `;
    
    console.log(`Found ${nearbySellers.length} sellers within ${radius}km using PostGIS`);
    
    // Transform the results to match the expected format
    const formattedSellers = nearbySellers.map(seller => ({
      id: seller.id,
      shopName: seller.shop_name,
      address: seller.address,
      city: seller.city,
      state: seller.state,
      pincode: seller.pincode,
      categories: seller.categories || [],
      latitude: seller.latitude,
      longitude: seller.longitude,
      distance: parseFloat(seller.distance.toFixed(2))
    }));

    return NextResponse.json({
      sellers: formattedSellers,
      total: formattedSellers.length,
      radius
    });
    
  } catch (error) {
    console.error('Error in nearby sellers endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to find nearby sellers' },
      { status: 500 }
    );
  }
} 