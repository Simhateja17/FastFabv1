import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

// Simple in-memory cache to prevent redundant searches
const searchCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * GET handler for product search
 * Route: /api/products/search
 * 
 * Query parameters:
 * - search: The search query string
 * - category: (optional) Filter by category
 * - limit: (optional) Number of results to return (default: 20)
 * - page: (optional) Page number for pagination (default: 1)
 * - minPrice: (optional) Minimum price filter
 * - maxPrice: (optional) Maximum price filter
 */
export async function GET(request) {
  console.log("Search API called");
  
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : null;
    
    console.log(`Search API params: searchQuery=${searchQuery}, category=${category}`);
    
    if (!searchQuery) {
      return NextResponse.json(
        { error: 'Search query parameter is required' },
        { status: 400 }
      );
    }
    
    // Create a cache key from the request parameters
    const cacheKey = JSON.stringify({
      searchQuery,
      category,
      page,
      limit,
      minPrice,
      maxPrice
    });
    
    // Check if we have a cached result
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_TTL)) {
      console.log(`Using cached result for "${searchQuery}"`);
      return NextResponse.json(cachedResult.data);
    }
    
    // Simplify the query to make it more robust
    try {
      console.log("Building corrected search query");
      
      // 1. Get IDs of visible sellers
      const visibleSellers = await prisma.seller.findMany({
        where: { isVisible: true },
        select: { id: true },
      });
      const visibleSellerIds = visibleSellers.map(s => s.id);

      if (visibleSellerIds.length === 0) {
        console.log("No visible sellers found, returning empty result.");
        return NextResponse.json({ products: [], totalProducts: 0, totalPages: 0, currentPage: page });
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // 2. Build the Product query using visibleSellerIds
      let whereClause = {
        isActive: true,
        sellerId: { in: visibleSellerIds }, // Filter by seller IDs
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { category: { contains: searchQuery, mode: 'insensitive' } }
        ]
      };
      
      // Add category filter if provided
      if (category) {
        whereClause.category = category;
      }
      
      // Add price filters if provided
      if (minPrice !== null && !isNaN(minPrice)) {
        whereClause.sellingPrice = { ...(whereClause.sellingPrice || {}), gte: minPrice };
      }
      
      if (maxPrice !== null && !isNaN(maxPrice)) {
        whereClause.sellingPrice = { ...(whereClause.sellingPrice || {}), lte: maxPrice };
      }
      
      console.log(`Final where clause: ${JSON.stringify(whereClause)}`);
      
      // 3. Execute query with the corrected structure
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
              },
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.product.count({ where: whereClause })
      ]);
      
      console.log(`Search found ${products.length} results for "${searchQuery}"`);
      
      // Prepare the response
      const responseData = {
        products,
        query: searchQuery,
        totalProducts: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
      
      // Cache the result
      searchCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      cleanupCache();
      
      return NextResponse.json(responseData);
    } catch (error) {
      console.error(`Error executing search query:`, error);
      
      // Return a more generic error to avoid leaking details in production
      return NextResponse.json(
        { error: 'Failed to search products. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Fatal error in search API:`, error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to clean up expired cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
} 