import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';
import { findSellersInRadius, haversineDistance } from '@/app/api/utils/haversine';

export async function GET(request) {
  try {
    console.log("API Request received for nearby products");
    
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = parseFloat(searchParams.get('radius') || 3);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const searchQuery = searchParams.get('search');
    const minPrice = parseFloat(searchParams.get('minPrice'));
    const maxPrice = parseFloat(searchParams.get('maxPrice'));
    
    console.log(`API Request - Nearby Products:`, {
      coordinates: { latitude, longitude },
      radius,
      category,
      subcategory,
      searchQuery
    });
    
    // Validate essential parameters
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.error("Invalid coordinates:", { latitude, longitude });
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }
    
    const skip = (page - 1) * limit;
    
    // Fetch visible seller IDs first (This part is simplified, visibility is checked later)
    console.log("Fetching all seller IDs for potential proximity check...");
    const allSellers = await prisma.seller.findMany({
      where: {
        // We only need sellers with coordinates for the proximity check
        NOT: {
          OR: [
            { latitude: null },
            { longitude: null }
          ]
        }
      },
      select: {
        id: true,
        shopName: true, // Needed for `findSellersInRadius`
        latitude: true,
        longitude: true,
        isVisible: true // Need visibility status for later filtering
      }
    });

    // If location is provided, filter sellers by radius and visibility
    let nearbyVisibleSellerIds = [];
    let nearbySellersWithDistance = []; // Keep this to add distance later
    let isLocationFilter = false;
    
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      isLocationFilter = true;
      
      // Enforce 3km radius maximum
      const enforceRadius = Math.min(radius, 3);
      console.log(`Finding VISIBLE sellers within ${enforceRadius}km radius`);
      
      try {
        // Adapt sellers for the radius function
        const adaptedSellers = allSellers.map(seller => ({
          id: seller.id,
          name: seller.shopName,
          latitude: seller.latitude,
          longitude: seller.longitude,
          isVisible: seller.isVisible // Carry visibility over
        }));
        
        // Find sellers within radius
        nearbySellersWithDistance = findSellersInRadius(adaptedSellers, latitude, longitude, enforceRadius)
          .filter(seller => 
            seller.distance !== null && 
            !isNaN(seller.distance) && 
            seller.distance <= enforceRadius &&
            seller.isVisible // Ensure they are visible HERE
          );
        
        nearbyVisibleSellerIds = nearbySellersWithDistance.map(s => s.id);

        console.log(`Found ${nearbyVisibleSellerIds.length} nearby visible sellers.`);
        
        // If no nearby visible sellers, return empty results early
        if (nearbyVisibleSellerIds.length === 0) {
          return NextResponse.json({
            products: [],
            isLocationFilter: true,
            totalProducts: 0,
            totalPages: 0,
            currentPage: page
          });
        }
      } catch (error) {
        console.error("Error processing nearby sellers:", error);
        return NextResponse.json(
          { error: 'Failed to process location data' },
          { status: 500 }
        );
      }
    } else {
      // If no location, filter all sellers down to just the visible ones
      nearbyVisibleSellerIds = allSellers.filter(s => s.isVisible).map(s => s.id);
      if (nearbyVisibleSellerIds.length === 0) {
        console.log("No visible sellers found (non-location query), returning empty result.");
        return NextResponse.json({ products: [], totalProducts: 0, totalPages: 0, currentPage: page });
      }
    }
    
    // Build the main product query using the determined visible seller IDs
    let whereClause = {
      isActive: true,
      sellerId: { in: nearbyVisibleSellerIds } // Use the filtered IDs
    };
    
    // Add other filters (category, subcategory, price, search)
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
    
    console.log(`Final where clause: ${JSON.stringify(whereClause)}`);
    
    try {
      // Execute the query with the corrected where clause
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
              longitude: true
            },
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: isLocationFilter ? 0 : skip,
        take: isLocationFilter ? 1000 : limit, // Get all for location filtering
      });
      
      const totalCount = await prisma.product.count({ where: whereClause });
      
      console.log(`Query returned ${products.length} products`);
      
      // If location filter is active, add distance information to products
      let processedProducts = products;
      
      if (isLocationFilter && nearbySellersWithDistance.length > 0) {
        // Create map of seller distances for quick lookup
        const sellerDistances = new Map(
          nearbySellersWithDistance.map(seller => [seller.id, seller.distance])
        );
        
        // Add distance to each product
        processedProducts = products.map(product => ({
          ...product,
          distance: sellerDistances.get(product.sellerId) || null,
          seller: product.seller ? {
            ...product.seller,
            distance: sellerDistances.get(product.sellerId) || null
          } : null
        }));
        
        // Sort by distance
        processedProducts.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        
        // Apply manual pagination for location-filtered results if needed
        if (processedProducts.length > limit) {
          const startIdx = (page - 1) * limit;
          processedProducts = processedProducts.slice(startIdx, startIdx + limit);
        }
      }
      
      return NextResponse.json({
        products: processedProducts,
        isLocationFilter,
        totalProducts: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      });
    } catch (error) {
      console.error("Error executing product query:", error);
      return NextResponse.json(
        { error: 'Failed to fetch products. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in nearby products API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 