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

    // Get all sellers with basic data
    const sellers = await prisma.seller.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        phone: true,
        shopName: true,
        ownerName: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        openTime: true,
        closeTime: true,
        categories: true,
        createdAt: true,
        updatedAt: true,
        isVisible: true,
        latitude: true,
        longitude: true,
        isPhoneVerified: true,
        gstNumber: true,
        manuallyHidden: true,
        bankAccountName: true,
        bankName: true,
        accountNumber: true,
        ifsc: true,
        balance: true,
        payoutsEnabled: true
      }
    });

    // Get product counts for each seller separately
    const sellersWithProductCounts = await Promise.all(
      sellers.map(async (seller) => {
        const productCount = await prisma.product.count({
          where: { sellerId: seller.id }
        });
        
        return {
          ...seller,
          productCount
        };
      })
    );

    return NextResponse.json(sellersWithProductCounts);
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