import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// GET all sellers (for superadmin dashboard)
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

    // Get all sellers
    const sellers = await prisma.seller.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(sellers);
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return NextResponse.json(
      { message: "Failed to fetch sellers", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 