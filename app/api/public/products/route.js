import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET handler for all public products
 * Route: /api/public/products
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    console.log(`Fetching public products. Category: ${category}, Limit: ${limit}`);
    
    // Build filter based on query parameters
    const filter = {
      isActive: true, // Only return active products
    };
    
    // Add category filter if provided
    if (category) {
      filter.category = {
        equals: category,
        mode: 'insensitive', // Case insensitive search
      };
    }
    
    // Fetch products with filters
    const products = await prisma.product.findMany({
      where: filter,
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    
    return NextResponse.json({ 
      products,
      count: products.length
    });
    
  } catch (error) {
    console.error(`Error fetching public products: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to fetch public products', details: error.message },
      { status: 500 }
    );
  }
} 