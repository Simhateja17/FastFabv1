import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

export async function GET(request) {
  try {
    console.log("API Request received for nearby products");
    
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = Math.min(parseFloat(searchParams.get('radius') || '3'), 3);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const searchQuery = searchParams.get('search');
    const minPrice = parseFloat(searchParams.get('minPrice'));
    const maxPrice = parseFloat(searchParams.get('maxPrice'));
    
    console.log('Search parameters:', {
      coordinates: { latitude, longitude },
      radius,
      category,
      subcategory,
      searchQuery,
      page,
      limit,
      priceRange: { minPrice, maxPrice }
    });
    
    // Validate essential parameters
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.error("Invalid coordinates:", { latitude, longitude });
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }
    
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
      console.log('No nearby sellers found');
      return NextResponse.json({
        products: [],
        isLocationFilter: true,
        totalProducts: 0,
        totalPages: 0,
        currentPage: page
      });
    }
    
    const nearbySellerIds = nearbySellers.map(s => s.id);
    console.log(`Found ${nearbySellerIds.length} nearby sellers`);
    
    // Build the product query
    let whereClause = {
      isActive: true,
      sellerId: { in: nearbySellerIds }
    };
    
    if (category) whereClause.category = category;
    if (subcategory) whereClause.subcategory = subcategory;
    if (!isNaN(minPrice)) whereClause.sellingPrice = { ...(whereClause.sellingPrice || {}), gte: minPrice };
    if (!isNaN(maxPrice)) whereClause.sellingPrice = { ...(whereClause.sellingPrice || {}), lte: maxPrice };
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ];
    }
    
    // Create a Map for quick distance lookups
    const sellerDistances = new Map(
      nearbySellers.map(seller => [seller.id, seller.distance])
    );
    
    // Get products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          seller: {
            select: {
              id: true,
              shopName: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.product.count({ where: whereClause })
    ]);
    
    // Add distance to products
    const productsWithDistance = products.map(product => ({
      ...product,
      distance: sellerDistances.get(product.sellerId),
      seller: product.seller ? {
        ...product.seller,
        distance: sellerDistances.get(product.sellerId)
      } : null
    }));
    
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`Returning ${products.length} products (page ${page}/${totalPages})`);
    
    return NextResponse.json({
      products: productsWithDistance,
      isLocationFilter: true,
      totalProducts: totalCount,
      totalPages,
      currentPage: page
    });
    
  } catch (error) {
    console.error("Error processing nearby products request:", error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby products' },
      { status: 500 }
    );
  }
} 