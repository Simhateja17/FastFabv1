import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from "@/app/lib/auth";
import { PrismaClient, Prisma } from '@prisma/client'; // Import PrismaClient and Prisma types
import { v4 as uuidv4 } from 'uuid'; // Import uuid

const prisma = new PrismaClient(); // Initialize PrismaClient

// Server-side error handler functions (direct implementations instead of imports)
function createErrorResponse(message, status = 500) {
  return NextResponse.json(
    { error: true, message },
    { status }
  );
}
//hi
function createSuccessResponse(data, status = 200) {
  return NextResponse.json(
    { error: false, ...data },
    { status }
  );
}

// Server-side error handler wrapper
function withErrorHandler(handler) {
  return async function(req, context) {
    try {
      // Call the original handler
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);

      // Ensure we return JSON instead of allowing Next.js to render an HTML error page
      return NextResponse.json(
        { 
          error: true, 
          message: error.message || 'An unexpected error occurred',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: error.status || 500 }
      );
    }
  };
}

export const GET = withErrorHandler(async (request) => {
  // 1. Authenticate the request
  const authResult = await auth(request);
  
  if (!authResult.success || !authResult.sellerId) {
    console.error("[GET /api/seller/products] Authentication failed:", authResult.message);
    return createErrorResponse(authResult.message || "Authentication required", 401);
  }
  
  const sellerId = authResult.sellerId;
  console.log(`[GET /api/seller/products] Authenticated seller: ${sellerId}`);
  
  // 3. Fetch products directly using Prisma
  try {
    console.log(`Fetching products for sellerId: ${sellerId}`);
    const products = await prisma.product.findMany({
        where: {
            sellerId: sellerId, 
            isActive: true, // Optionally only fetch active products
        },
        include: {
            colorInventory: {
                 select: {
                     color: true,
                     colorCode: true,
                     inventory: true // Assuming inventory is stored here
                 }
            },
            // The `images` field (String[]) is automatically included
            // Add other relations like category, variants if needed
        },
        orderBy: {
            createdAt: 'desc', // Order by creation date, newest first
        },
    });

    console.log(`Found ${products.length} products for seller ${sellerId}`);

    // Format the response structure if needed, e.g., { products: [...] }
    return createSuccessResponse({ products: products });

  } catch (dbError) {
    console.error(`[GET /api/seller/products] Database error fetching products for seller ${sellerId}:`, dbError);
    return createErrorResponse('Failed to fetch products due to a database error.', 500);
  } finally {
     // Disconnect Prisma client
     await prisma.$disconnect().catch(e => console.error("Error disconnecting Prisma:", e));
  }
});

// Ensure POST handler correctly structures data for Prisma
export async function POST(request) {
  try {
    // 1. Authenticate
    const authResult = await auth(request);
    if (!authResult.success || !authResult.sellerId) {
        return createErrorResponse(authResult.message || "Authentication required", 401);
    }
    const sellerId = authResult.sellerId;

    // 2. Get request body
    const body = await request.json();

    // 3. Generate a unique ID for the new product
    const newProductId = uuidv4();
    console.log(`[POST /api/seller/products] Generated new Product ID: ${newProductId}`);

    // 4. Structure data for Prisma create, including nested create for colors
    const productData = {
        id: newProductId,
        name: body.name,
        description: body.description,
        mrpPrice: body.mrpPrice,
        sellingPrice: body.sellingPrice,
        images: body.images || [],
        category: body.category,
        subcategory: body.subcategory,
        isReturnable: body.isReturnable,
        sizeQuantities: body.sizeQuantities || {},
        updatedAt: new Date(),
        seller: { connect: { id: sellerId } },
        
        // Correct syntax for nested create of related colorInventories
        colorInventory: {
            create: (body.colorInventories || []).map(inv => ({
                id: uuidv4(), // Generate unique ID for each ColorInventory
                // Prisma automatically links productId
                color: inv.color,
                colorCode: inv.colorCode,
                inventory: inv.inventory || {},
                updatedAt: new Date() // Also set updatedAt for ColorInventory
            }))
        }
    };

    // Remove fields that shouldn't be directly in Product create data
    delete productData.sellerId; // Handled by connect
    delete productData.colorInventories; // Handled by nested create

    console.log(`Creating product for seller ${sellerId} with ID ${newProductId} and data:`, JSON.stringify(productData));

    // 5. Create product directly using Prisma
    const newProduct = await prisma.product.create({
        data: productData,
        include: { colorInventory: true }
    });

    console.log(`Successfully created product ${newProduct.id} for seller ${sellerId}`);
    return createSuccessResponse(newProduct, 201);

  } catch (error) {
    console.error('[POST /api/seller/products] Error creating product:', error);
    // Use the imported Prisma object for the instanceof check
    if (error instanceof Prisma.PrismaClientValidationError) {
        console.error("Prisma Validation Error Details:", error.message);
        return createErrorResponse(`Product creation failed due to invalid data: ${error.message}`, 400);
    }
    if (error.code === 'P2002') { // Example: Handle unique constraint violation
         return createErrorResponse(`Product creation failed: A unique constraint was violated.`, 409); // Conflict
    }
    return createErrorResponse(error.message || 'Failed to create product', 500);
  } finally {
     await prisma.$disconnect().catch(e => console.error("Error disconnecting Prisma:", e));
  }
}

export async function PUT(request) {
  // TODO: Refactor PUT to use Prisma directly, similar to POST
  return createErrorResponse("PUT method not fully implemented yet.", 501); 
}

export async function DELETE(request) {
   // TODO: Refactor DELETE to use Prisma directly 
   // Needs to get product ID from URL or body and verify ownership
  return createErrorResponse("DELETE method not fully implemented yet.", 501);
}

// Remove the old handleProductRequest function if it's no longer needed
// async function handleProductRequest(request, method) { ... }