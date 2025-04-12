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

    // Get all products with seller details
    const products = await prisma.product.findMany({
      include: {
        seller: {
          select: {
            id: true,
            shopName: true,
            ownerName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(products);
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