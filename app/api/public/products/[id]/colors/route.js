import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

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

    // Try to check via PublicProducts view first
    let product = null;
    try {
      product = await prisma.publicProducts.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
        },
      });
      
      if (product) {
        console.log(`Product found in PublicProducts view for ID: ${productId}`);
      }
    } catch (viewError) {
      console.warn(`Error accessing PublicProducts view: ${viewError.message}. Falling back to Product model.`);
    }
    
    // Fallback to traditional product check if PublicProducts view fails
    if (!product) {
      product = await prisma.product.findUnique({
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
    }

    // Fetch color inventory for this product with an explicit refresh
    // This ensures we're getting the most up-to-date data
    console.log(`Fetching latest color inventory data for product ID: ${productId}`);
    
    const colorInventories = await prisma.colorInventory.findMany({
      where: {
        productId: productId,
      },
      orderBy: {
        updatedAt: 'desc'  // Get the most recently updated colors first
      },
    });

    if (!colorInventories || colorInventories.length === 0) {
      console.log(`No color inventory found for product ID: ${productId}`);
      return NextResponse.json({ 
        colorInventories: [] 
      });
    }

    // Add cache control headers to prevent browser caching
    // This forces browsers to fetch fresh data each time
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('Expires', '0');
    headers.append('Surrogate-Control', 'no-store');

    // Return the color inventories with no-cache headers
    return NextResponse.json({ 
      colorInventories,
      timestamp: new Date().toISOString() // Add timestamp for debugging
    }, {
      headers
    });
    
  } catch (error) {
    console.error(`Error fetching color inventories: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to fetch color inventories', details: error.message },
      { status: 500 }
    );
  }
} 