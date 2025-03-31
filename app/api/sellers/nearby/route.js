import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { findSellersInRadius } from '@/app/api/utils/haversine';

const prisma = new PrismaClient();

/**
 * Get sellers near a specific location
 */
export async function GET(request) {
  console.log('Nearby Sellers API called');
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Get location parameters
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = parseFloat(searchParams.get('radius') || '3'); // Default 3km
    
    console.log('Location parameters:', { latitude, longitude, radius });
    
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
    
    // Get all sellers with coordinates
    const sellers = await prisma.seller.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        shopName: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        categories: true,
        latitude: true,
        longitude: true,
      },
    });
    
    console.log(`Found ${sellers.length} sellers with coordinates`);
    
    // Find sellers within radius
    const nearbySellers = findSellersInRadius(sellers, latitude, longitude, radius);
    
    console.log(`Found ${nearbySellers.length} sellers within ${radius}km`);
    
    return NextResponse.json({
      sellers: nearbySellers,
      total: nearbySellers.length,
      radius,
    });
    
  } catch (error) {
    console.error('Error fetching nearby sellers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby sellers', details: error.message },
      { status: 500 }
    );
  }
} 