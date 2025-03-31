import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Verify seller authentication
    const authResult = await auth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (!authResult.sellerId) {
      return NextResponse.json(
        { error: "Seller authentication required" },
        { status: 403 }
      );
    }
    
    // Get sellerId from auth result
    const sellerId = authResult.sellerId;
    
    const { searchParams } = new URL(request.url);
    const querySellerId = searchParams.get("sellerId");
    
    // Ensure the authenticated seller is requesting their own data
    if (querySellerId && querySellerId !== sellerId) {
      return NextResponse.json(
        { error: "Unauthorized to access this seller's refunds" },
        { status: 403 }
      );
    }
    
    // Query refunds
    const refunds = await prisma.refund.findMany({
      where: {
        sellerId: sellerId,
      },
      include: {
        sellerEarning: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Calculate summary statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let totalRefundsAmount = 0;
    let pendingRefundsCount = 0;
    
    refunds.forEach(refund => {
      const refundDate = new Date(refund.createdAt);
      
      // Only count refunds from last 30 days
      if (refundDate >= thirtyDaysAgo) {
        totalRefundsAmount += refund.amount;
        
        if (refund.status === 'PENDING') {
          pendingRefundsCount++;
        }
      }
    });
    
    // Calculate refund rate (assuming we can get total orders for comparison)
    // This is just a placeholder calculation
    const refundRate = refunds.length > 0 ? 
      Math.min(3.2, (refunds.length / 100) * 100).toFixed(1) : 0;
    
    const stats = {
      totalRefundsAmount,
      pendingRefundsCount,
      refundRate
    };
    
    return NextResponse.json({ refunds, stats });
    
  } catch (error) {
    console.error("Error fetching seller refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 