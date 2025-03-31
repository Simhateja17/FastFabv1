import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { findSellersInRadius } from '@/app/api/utils/haversine';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = parseFloat(searchParams.get('radius') || 3);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    
    const skip = (page - 1) * limit;
    
    // Base query filters
    const filters = {
      where: {
        AND: [
          { isAvailable: true },
          { isApproved: true }
        ]
      },
      include: {
        images: true,
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImage: true,
            latitude: true,
            longitude: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    };
    
    // Add category filter if provided
    if (category) {
      filters.where.AND.push({
        category: {
          slug: category
        }
      });
    }
    
    // Add search query if provided
    if (searchQuery) {
      filters.where.AND.push({
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } }
        ]
      });
    }
    
    // If location is provided, first get all seller IDs within radius
    let nearbySellers = [];
    let productsWithDistance = [];
    let isLocationFilter = false;
    
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      isLocationFilter = true;
      
      // IMPORTANT: Enforce 3km radius regardless of input for business requirements
      const enforceRadius = Math.min(radius, 3);
      console.log(`Finding sellers within ${enforceRadius}km of coordinates [${latitude}, ${longitude}] (original request radius: ${radius}km, enforced to 3km max)`);
      
      // Get all sellers with valid coordinates
      const sellers = await prisma.user.findMany({
        where: {
          role: 'SELLER',
          NOT: {
            OR: [
              { latitude: null },
              { longitude: null }
            ]
          }
        },
        select: {
          id: true,
          latitude: true,
          longitude: true
        }
      });
      
      console.log(`Found ${sellers.length} sellers with valid coordinates`);
      
      // Filter sellers within radius with strict 3km limit
      nearbySellers = findSellersInRadius(sellers, latitude, longitude, enforceRadius);
      console.log(`Found ${nearbySellers.length} sellers within ${enforceRadius}km radius`);
      
      // Debug: Log seller distances to identify any issues
      console.log(`Nearby sellers and distances: ${JSON.stringify(nearbySellers.map(s => ({id: s.id, distance: s.distance})))}`);
      
      if (nearbySellers.length > 0) {
        // Get seller IDs
        const sellerIds = nearbySellers.map(seller => seller.id);
        
        // Add seller filter to query
        filters.where.AND.push({
          sellerId: {
            in: sellerIds
          }
        });
      } else {
        // No nearby sellers found
        return NextResponse.json({
          products: [],
          isLocationFilter: true,
          totalProducts: 0,
          totalPages: 0,
          currentPage: page,
          message: "No sellers found within the specified radius"
        });
      }
    }
    
    // Execute query
    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany(filters),
      prisma.product.count({ where: filters.where })
    ]);
    
    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);
    
    // Add distance to products if location filter was applied
    if (isLocationFilter) {
      // Create a map of seller distances for quick lookup
      const sellerDistanceMap = new Map(
        nearbySellers.map(seller => [seller.id, seller.distance])
      );
      
      // Add distance to each product
      productsWithDistance = products.map(product => {
        const distance = sellerDistanceMap.get(product.sellerId) || null;
        return {
          ...product,
          distance,
          seller: {
            ...product.seller,
            distance
          }
        };
      });
      
      // Sort by distance if location filter applied
      productsWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }
    
    return NextResponse.json({
      products: isLocationFilter ? productsWithDistance : products,
      isLocationFilter,
      totalProducts,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching nearby products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message },
      { status: 500 }
    );
  }
} 