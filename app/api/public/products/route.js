import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

/**
 * GET handler for all public products
 * Route: /api/public/products
 */
export async function GET(request) {
  console.log("Public Products API called");
  
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    console.log(`Public Products API params: category=${category}, limit=${limit}`);
    
    // Build the correct query structure for seller filtering
    try {
      console.log("Fetching visible seller IDs");
      
      // 1. Get IDs of visible sellers
      const visibleSellers = await prisma.seller.findMany({
        where: { isVisible: true },
        select: { id: true },
      });
      const visibleSellerIds = visibleSellers.map(s => s.id);

      if (visibleSellerIds.length === 0) {
        console.log("No visible sellers found, returning empty result.");
        return NextResponse.json({ products: [], count: 0 });
      }
      
      // 2. Build the Product query using visibleSellerIds
      let whereClause = {
        isActive: true,
        sellerId: { in: visibleSellerIds }, // Filter by seller IDs
      };
      
      // Add category filter if provided
      if (category) {
        whereClause.category = category;
      }
      
      console.log(`Final where clause: ${JSON.stringify(whereClause)}`);
      
      // 3. Execute query with corrected conditions
      const products = await prisma.product.findMany({
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
        take: limit,
      });
      
      console.log(`Found ${products.length} products`);
      
      return NextResponse.json({ 
        products,
        count: products.length
      });
    } catch (error) {
      console.error(`Error executing products query:`, error);
      return NextResponse.json(
        { error: 'Failed to fetch products. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Fatal error in public products API:`, error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 