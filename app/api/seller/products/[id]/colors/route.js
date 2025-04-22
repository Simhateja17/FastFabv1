import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Not needed here
import { PrismaClient } from '@prisma/client';
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

// Keep error/success helpers
function createErrorResponse(message, status = 500) {
  return NextResponse.json({ error: true, message }, { status });
}
function createSuccessResponse(data, status = 200) {
  return NextResponse.json({ error: false, ...data }, { status });
}
//hi
// Remove the HOC wrapper function or just don't use it for GET
// function withErrorHandler(handler) { ... }

// Define and Export the GET handler directly
export async function GET(request, { params }) { // Use destructured params
    let productId = null;
    try {
        // 1. Get Product ID from URL
        productId = params.id; // Use destructured params
        if (!productId) {
            return createErrorResponse("Product ID is missing in the URL.", 400);
        }
        console.log(`[GET /api/seller/products/${productId}/colors] Request received.`);

        // 2. Authenticate the request
        const authResult = await auth(request);
        if (!authResult.success) {
            console.error(`[GET /api/seller/products/${productId}/colors] Authentication failed:`, authResult.message);
            return createErrorResponse(authResult.message || "Authentication required", 401);
        }

        // 3. Verify Product Exists (Optional but good practice)
        const productExists = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true } // Only need to check existence
        });

        if (!productExists) {
            console.log(`Product ${productId} not found when fetching colors.`);
            return createErrorResponse("Product not found.", 404);
        }

        // 4. Fetch Color Inventories Directly using Prisma
        console.log(`Fetching color inventories for product ${productId}`);
        const colorInventories = await prisma.colorInventory.findMany({
            where: {
                productId: productId,
            },
        });

        console.log(`Found ${colorInventories.length} color inventories for product ${productId}`);
        return createSuccessResponse({ colorInventories: colorInventories });

    // Move error handling inside the main function
    } catch (error) {
      console.error(`API Error in [id]/colors route for product ${productId}:`, error);
      // Basic error check for Prisma client connection issues
       if (error.code === 'P1001' || error.code === 'P1017') {
             return createErrorResponse('Database connection error.', 503);
       }
      // Default error response
      return NextResponse.json(
        { 
          error: true, 
          message: error.message || 'An unexpected error occurred fetching colors',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: error.status || 500 }
      );
    } finally {
        await prisma.$disconnect().catch(e => console.error("Error disconnecting Prisma:", e));
    }
}

// Keep stubs for PUT/DELETE if they exist, wrapped or unwrapped as needed
// export const PUT = withErrorHandler(...) // Or define directly if needed
// export const DELETE = withErrorHandler(...) // Or define directly if needed 