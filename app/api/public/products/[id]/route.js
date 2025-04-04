import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

/**
 * GET handler for public product details
 * Route: /api/public/products/[id]
 */
export async function GET(request, { params }) {
  try {
    // Await params before accessing properties
    const { id: productId } = params;
    
    console.log(`Fetching product details for ID: ${productId}`);
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Try to fetch from PublicProducts view first (which filters active products from visible sellers)
    try {
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
            },
          },
        },
      });

      if (product) {
        console.log(`Product found in PublicProducts for ID: ${productId}`);
        return NextResponse.json(product);
      }
    } catch (viewError) {
      console.warn(`Error accessing PublicProducts view: ${viewError.message}. Falling back to Product model.`);
    }

    // Fallback to Product model with visibility filters if PublicProducts view is not available
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        isActive: true,
      },
      include: {
        colorInventory: true,
        seller: {
          select: {
            id: true,
            shopName: true,
            city: true,
            state: true,
            isVisible: true,
          },
        },
      },
    });

    if (!product) {
      console.log(`Product not found for ID: ${productId}`);
      return NextResponse.json(
        { error: 'Product not found or not available' },
        { status: 404 }
      );
    }

    // Check if the seller is visible
    if (!product.seller?.isVisible) {
      console.log(`Product belongs to a seller with visibility turned off: ${productId}`);
      return NextResponse.json(
        { error: 'Product not available' },
        { status: 404 }
      );
    }

    // Return the product details
    return NextResponse.json(product);
    
  } catch (error) {
    console.error(`Error fetching product details: ${error.message}`);
    console.error(error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch product details', details: error.message },
      { status: 500 }
    );
  }
} 