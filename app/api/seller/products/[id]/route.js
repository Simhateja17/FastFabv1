import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient, PrismaClientValidationError } from '@prisma/client';
import { auth } from "@/app/lib/auth";

// Singleton pattern for PrismaClient
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();
//hi
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Reuse error/success helpers (or define them here if not shared)
function createErrorResponse(message, status = 500) {
  return NextResponse.json({ error: true, message }, { status });
}
function createSuccessResponse(data, status = 200) {
  return NextResponse.json({ error: false, ...data }, { status });
}
function withErrorHandler(handler) {
  return async function(req, context) {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API Error in [id] route:', error);
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

// GET handler for a specific product
export const GET = withErrorHandler(async (request, context) => {
    let productId = null;
    let authResult = null;
    try {
        // 1. Get Product ID from URL
        productId = context.params.id;
        if (!productId) {
            return createErrorResponse("Product ID is missing in the URL.", 400);
        }
        console.log(`[GET /api/seller/products/${productId}] Request received.`);

        // 2. Authenticate the request
        authResult = await auth(request);
        if (!authResult.success || !authResult.sellerId) {
            console.error(`[GET /api/seller/products/${productId}] Authentication failed:`, authResult.message);
            return createErrorResponse(authResult.message || "Authentication required", 401);
        }
        const sellerId = authResult.sellerId;
        console.log(`[GET /api/seller/products/${productId}] Authenticated seller: ${sellerId}`);

        // 3. Fetch Product with related data
        console.log(`Fetching product ${productId} for seller ${sellerId}`);
        const product = await prisma.product.findUnique({
            where: { 
                id: productId, 
                // Optional: Include sellerId here if you only want to find *their* product directly
                // sellerId: sellerId 
            },
            include: {
                colorInventory: true // Include related color inventory records
            }
        });

        // 4. Verify Product Existence and Ownership
        if (!product) {
            console.log(`Product ${productId} not found.`);
            return createErrorResponse("Product not found.", 404);
        }

        if (product.sellerId !== sellerId) {
            console.warn(`Seller ${sellerId} attempted to access product ${productId} owned by ${product.sellerId}.`);
            // Even if found, return 404 to not leak existence of other sellers' products
            return createErrorResponse("Product not found.", 404); 
        }

        console.log(`Successfully fetched product ${productId} with related data.`);
        // 5. Return Product Data
        return createSuccessResponse({ product }, 200);

    } catch (error) {
        console.error(`[GET /api/seller/products/${productId}] Error during fetch:`, error);
        
        // Handle specific Prisma errors if needed (e.g., P2025 is covered by !product check)
        if (error.code === 'P2023' && error.message.includes('Malformed ObjectID')) {
             console.log(`Malformed product ID received: ${productId}`);
             return createErrorResponse("Invalid product ID format.", 400);
        }
        
        // Default error from withErrorHandler will catch others
        throw error; // Re-throw for the wrapper to handle
    } finally {
        // Consider if disconnect is needed after every request in serverless environments
        // await prisma.$disconnect().catch(e => console.error("Error disconnecting Prisma:", e));
    }
});

// DELETE handler for a specific product
export const DELETE = withErrorHandler(async (request, context) => {
    let productId = null;
    let authResult = null;
    try {
        // 1. Get Product ID from URL
        productId = context.params.id;
        if (!productId) {
            return createErrorResponse("Product ID is missing in the URL.", 400);
        }
        console.log(`[DELETE /api/seller/products/${productId}] Request received.`);

        // 2. Authenticate the request
        authResult = await auth(request);
        if (!authResult.success || !authResult.sellerId) {
            console.error(`[DELETE /api/seller/products/${productId}] Authentication failed:`, authResult.message);
            return createErrorResponse(authResult.message || "Authentication required", 401);
        }
        const sellerId = authResult.sellerId;
        console.log(`[DELETE /api/seller/products/${productId}] Authenticated seller: ${sellerId}`);

        // 3. Verify Ownership
        console.log(`Verifying ownership for product ${productId} and seller ${sellerId}`);
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { sellerId: true } // Only select sellerId for ownership check
        });

        if (!product) {
            console.log(`Product ${productId} not found.`);
            return createErrorResponse("Product not found.", 404);
        }

        if (product.sellerId !== sellerId) {
            console.warn(`Seller ${sellerId} attempted to delete product ${productId} owned by ${product.sellerId}.`);
            return createErrorResponse("You do not have permission to delete this product.", 403); // Forbidden
        }

        // 4. DEACTIVATE the product (Soft Delete)
        console.log(`Attempting to deactivate product ${productId}`);
        
        const deactivatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { isActive: false },
        });

        // Remove old transaction delete:
        // const deleteResult = await prisma.$transaction(async (tx) => {
        //     // First, delete related color inventories
        //     const deletedColors = await tx.colorInventory.deleteMany({
        //         where: { productId: productId },
        //     });
        //     console.log(`Deleted ${deletedColors.count} color inventory records for product ${productId}`);
        //     // Then, delete the product itself
        //     const deletedProduct = await tx.product.delete({
        //         where: { id: productId },
        //     });
        //     console.log(`Deleted product ${productId}`);
        //     return deletedProduct; 
        // });

        console.log(`Successfully deactivated product ${productId}`);
        // Return success message indicating deactivation
        return createSuccessResponse({ 
            message: "Product deactivated successfully",
            deactivated: true // Add flag for frontend if needed
         }, 200);
    
  } catch (error) {
        console.error(`[DELETE /api/seller/products/${productId}] Error during deactivation:`, error);
        
        // Handle potential errors during update
        if (error.code === 'P2025') { // Record to update not found
             console.log(`Product ${productId} not found during deactivation attempt.`);
             return createErrorResponse("Product not found.", 404);
        } 
        // Default error from withErrorHandler will catch others
        throw error; // Re-throw for the wrapper to handle
    } finally {
        await prisma.$disconnect().catch(e => console.error("Error disconnecting Prisma:", e));
    }
});

// PUT handler for updating a specific product
export const PUT = withErrorHandler(async (request, context) => {
    let productId = null;
    let authResult = null;
    try {
        // 1. Get Product ID from URL
        productId = context.params.id;
        if (!productId) {
            return createErrorResponse("Product ID is missing in the URL.", 400);
        }
        console.log(`[PUT /api/seller/products/${productId}] Request received.`);

        // 2. Authenticate the request
        authResult = await auth(request);
        if (!authResult.success || !authResult.sellerId) {
            console.error(`[PUT /api/seller/products/${productId}] Authentication failed:`, authResult.message);
            return createErrorResponse(authResult.message || "Authentication required", 401);
        }
        const sellerId = authResult.sellerId;
        console.log(`[PUT /api/seller/products/${productId}] Authenticated seller: ${sellerId}`);

        // 3. Get Update Data from Request Body
        const updateData = await request.json();
        console.log(`[PUT /api/seller/products/${productId}] Received update data:`, JSON.stringify(updateData).substring(0, 500) + '...'); // Log snippet

        // Basic validation (can be enhanced)
        if (!updateData || typeof updateData !== 'object') {
            return createErrorResponse("Invalid update data provided.", 400);
        }
        if (!updateData.name || !updateData.category || !updateData.subcategory) {
             return createErrorResponse("Missing required fields (name, category, subcategory).", 400);
        }
        
        // Separate color inventory data
        const { colorInventories, ...productUpdateData } = updateData;

        // Prepare color inventory data for nested write
        const colorInventoryCreateData = (colorInventories || []).map(ci => ({
            color: ci.color,
            colorCode: ci.colorCode || '', 
            inventory: ci.inventory || {} 
         }));
         console.log(`[PUT /api/seller/products/${productId}] Prepared color inventory create data:`, JSON.stringify(colorInventoryCreateData).substring(0, 300) + '...');

        // 4. Verify Ownership
        console.log(`[PUT /api/seller/products/${productId}] Verifying ownership...`);
        const existingProduct = await prisma.product.findUnique({
            where: { id: productId },
            select: { sellerId: true } // Only need sellerId for check
        });

        if (!existingProduct) {
            console.log(`[PUT /api/seller/products/${productId}] Product not found.`);
            return createErrorResponse("Product not found.", 404);
        }

        if (existingProduct.sellerId !== sellerId) {
            console.warn(`[PUT /api/seller/products/${productId}] Seller ${sellerId} attempted to update product owned by ${existingProduct.sellerId}.`);
            return createErrorResponse("You do not have permission to update this product.", 403);
        }

        // 5. Perform Update within a Transaction using Nested Write
        console.log(`[PUT /api/seller/products/${productId}] Starting update transaction with nested write...`);
        const updatedProduct = await prisma.$transaction(async (tx) => {
            const productResult = await tx.product.update({
                where: { id: productId },
                data: {
                    // Explicitly list ONLY the fields to update on Product
                    name: productUpdateData.name,
                    description: productUpdateData.description,
                    mrpPrice: productUpdateData.mrpPrice, 
                    sellingPrice: productUpdateData.sellingPrice,
                    category: productUpdateData.category,
                    subcategory: productUpdateData.subcategory,
                    isReturnable: productUpdateData.isReturnable,
                    images: productUpdateData.images,
                    sizeQuantities: productUpdateData.sizeQuantities || {},
                    // Ensure updatedAt is handled automatically by Prisma (@updatedAt)
                    
                    // Nested write for colorInventory remains the same for now:
                    colorInventory: {
                        deleteMany: {}, 
                        create: colorInventoryCreateData 
                    }
                },
                include: { 
                    colorInventory: true 
                }
            });
            console.log(`[PUT /api/seller/products/${productId}] Product and color inventory update attempted.`);
            return productResult; 
        });
        
        console.log(`[PUT /api/seller/products/${productId}] Transaction completed successfully.`);

        // No need to fetch again, update returns the included data
        // const finalProduct = await prisma.product.findUnique(...);

        // 6. Return Success Response
        return createSuccessResponse({ 
            message: "Product updated successfully", 
            product: updatedProduct // Return the result from the update call
        }, 200);
    
  } catch (error) {
        console.error(`[PUT /api/seller/products/${productId}] Error during update:`, error);
        // Handle potential Prisma or validation errors
        if (error.code === 'P2025') { 
             console.log(`[PUT /api/seller/products/${productId}] Product not found during update/delete operation.`);
             return createErrorResponse("Product not found or conflict during update.", 404);
        } 
        // Use the correctly imported PrismaClientValidationError
        if (error instanceof PrismaClientValidationError) { 
            console.warn(`[PUT /api/seller/products/${productId}] Validation error:`, error.message);
            // Extract a more specific message if possible
            const specificError = error.message.split('\n').slice(-2)[0]; // Try to get the last meaningful line
            return createErrorResponse(`Invalid data format: ${specificError || error.message}`, 400);
        }
        // Default error from withErrorHandler will catch others
        throw error; // Re-throw for the wrapper to handle
    } finally {
         await prisma.$disconnect().catch(e => console.error("Error disconnecting Prisma:", e));
    }
}); 