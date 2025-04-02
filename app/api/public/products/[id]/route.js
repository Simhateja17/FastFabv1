import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET handler for public product details
 * Route: /api/public/products/[id]
 */
export async function GET(request, { params }) {
  try {
    // Await params before accessing properties
    const { id: productId } = await params;
    
    console.log(`Fetching product details for ID: ${productId}`);
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Fetch the product with its details including color inventory
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        colorInventory: true,
        seller: {
          select: {
            id: true,
            shopName: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!product) {
      console.log(`Product not found for ID: ${productId}`);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Return the product details
    return NextResponse.json(product);
    
  } catch (error) {
    console.error(`Error fetching product details: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to fetch product details', details: error.message },
      { status: 500 }
    );
  }
} 