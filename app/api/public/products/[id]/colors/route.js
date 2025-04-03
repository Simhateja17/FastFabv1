import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET handler for product color inventory
 * Route: /api/public/products/[id]/colors
 */
export async function GET(request, { params }) {
  try {
    // Await params before accessing properties
    const { id: productId } = await params;
    
    console.log(`Fetching color inventory for product ID: ${productId}`);
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // First check if the product exists and if the seller is visible
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        isActive: true,
        seller: {
          select: {
            isVisible: true,
          },
        },
      },
    });

    // If product doesn't exist or is not active, return 404
    if (!product || !product.isActive) {
      console.log(`Product not found or not active for ID: ${productId}`);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if seller's visibility is turned off
    if (!product.seller?.isVisible) {
      console.log(`Product ${productId} belongs to a seller with visibility turned off`);
      return NextResponse.json(
        { error: 'Product not available' },
        { status: 404 }
      );
    }

    // Fetch color inventory for this product
    const colorInventories = await prisma.colorInventory.findMany({
      where: {
        productId: productId,
      },
    });

    if (!colorInventories || colorInventories.length === 0) {
      console.log(`No color inventory found for product ID: ${productId}`);
      return NextResponse.json({ 
        colorInventories: [] 
      });
    }

    // Return the color inventories
    return NextResponse.json({ 
      colorInventories 
    });
    
  } catch (error) {
    console.error(`Error fetching color inventories: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to fetch color inventories', details: error.message },
      { status: 500 }
    );
  }
} 