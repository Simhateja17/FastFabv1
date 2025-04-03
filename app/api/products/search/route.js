import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : null;
    
    console.log(`Search API called with query: "${searchQuery}", category: ${category}, page: ${page}, limit: ${limit}`);
    
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
    
    // Using PublicProducts view for search
    const whereClause = {
      AND: [
        {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { category: { contains: searchQuery, mode: 'insensitive' } }
          ]
        }
      ]
    };
    
    // Add category filter if provided
    if (category) {
      whereClause.AND.push({ 
        category: { 
          equals: category,
          mode: 'insensitive'
        } 
      });
    }
    
    // Add price filters if provided
    if (minPrice !== null || maxPrice !== null) {
      const priceFilter = {};
      
      if (minPrice !== null) {
        priceFilter.gte = minPrice;
      }
      
      if (maxPrice !== null) {
        priceFilter.lte = maxPrice;
      }
      
      if (Object.keys(priceFilter).length > 0) {
        whereClause.AND.push({ sellingPrice: priceFilter });
      }
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    try {
      // Try using the PublicProducts view first
      const [products, totalCount] = await Promise.all([
        prisma.publicProducts.findMany({
          where: whereClause,
          include: {
            seller: {
              select: {
                id: true,
                shopName: true,
                city: true,
                state: true,
              },
            },
            colorInventory: true
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.publicProducts.count({ where: whereClause })
      ]);
      
      // Calculate total pages
      const totalPages = Math.ceil(totalCount / limit);
      
      console.log(`Search found ${totalCount} results for "${searchQuery}"`);
      
      // Prepare the response
      const responseData = {
        products,
        query: searchQuery,
        totalProducts: totalCount,
        totalPages,
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
    } catch (viewError) {
      // If the view doesn't exist, fall back to the old method
      if (viewError.message && viewError.message.includes('relation "PublicProducts" does not exist')) {
        console.log("PublicProducts view not available, falling back to manual filtering");
        
        // Add visibility filters for the fallback approach
        whereClause.AND.push({ isActive: true });
        whereClause.AND.push({ 
          seller: {
            isVisible: true 
          }
        });
        
        // Execute with fallback
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
              },
              colorInventory: true
            },
            orderBy: {
              createdAt: 'desc',
            },
            skip,
            take: limit,
          }),
          prisma.product.count({ where: whereClause })
        ]);
        
        // Calculate total pages
        const totalPages = Math.ceil(totalCount / limit);
        
        console.log(`Search found ${totalCount} results for "${searchQuery}" (fallback method)`);
        
        // Prepare the response
        const responseData = {
          products,
          query: searchQuery,
          totalProducts: totalCount,
          totalPages,
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
      } else {
        // If it's a different error, log and throw
        console.error(`Error in search API using PublicProducts view: ${viewError.message}`);
        throw viewError;
      }
    }
  } catch (error) {
    console.error(`Error in search API: ${error.message}`);
    return NextResponse.json(
      { 
        error: 'Failed to search products', 
        details: error.message 
      },
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