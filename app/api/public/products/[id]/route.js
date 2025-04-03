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

    // Fetch the product from the PublicProducts view, which only includes products from visible sellers
    // Also include related color inventory and seller details
    const product = await prisma.publicProducts.findUnique({
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
            // isVisible is no longer needed here as the view handles filtering
          },
        },
      },
    });

    if (!product) {
      // This condition now handles both product not found and product belonging to a hidden seller
      console.log(`Product not found or not available (seller hidden) for ID: ${productId}`);
      return NextResponse.json(
        { error: 'Product not found or not available' },
        { status: 404 }
      );
    }

    // The check for seller visibility is no longer needed here,
    // as querying PublicProducts handles this automatically.
    // if (!product.seller?.isVisible) { ... } // Removed this block

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