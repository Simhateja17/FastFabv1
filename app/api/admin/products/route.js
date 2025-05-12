import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// GET all products (for superadmin dashboard)
export async function GET(request) {
  try {
    // Verify admin authentication using JWT
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }

    // Get all products with sellerId
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        mrpPrice: true,
        sellingPrice: true,
        images: true,
        category: true,
        subcategory: true,
        sizeQuantities: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        sellerId: true,
        variantGroupId: true,
        isReturnable: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch seller data separately for each product
    const productsWithSellerData = await Promise.all(
      products.map(async (product) => {
        const seller = await prisma.seller.findUnique({
          where: { id: product.sellerId },
          select: {
            id: true,
            shopName: true,
            ownerName: true,
            phone: true
          }
        });
        
        return {
          ...product,
          seller
        };
      })
    );

    return NextResponse.json(productsWithSellerData);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { message: "Failed to fetch products", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 