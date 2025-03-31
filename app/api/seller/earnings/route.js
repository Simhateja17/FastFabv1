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
        { error: "Unauthorized to access this seller's earnings" },
        { status: 403 }
      );
    }
    
    // Query sellerEarnings
    const earnings = await prisma.sellerEarning.findMany({
      where: {
        sellerId: sellerId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Calculate summary statistics
    const currentDate = new Date();
    
    // Last 30 days
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);
    
    // Last 7 days
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(currentDate.getDate() - 7);
    
    // Last 90 days
    const ninetyDaysAgo = new Date(currentDate);
    ninetyDaysAgo.setDate(currentDate.getDate() - 90);
    
    // Calculate stats for different periods
    const stats = {
      "7days": calculateStats(earnings, sevenDaysAgo),
      "30days": calculateStats(earnings, thirtyDaysAgo),
      "90days": calculateStats(earnings, ninetyDaysAgo),
      "all": calculateStats(earnings, null)
    };
    
    return NextResponse.json({ earnings, stats });
    
  } catch (error) {
    console.error("Error fetching seller earnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to calculate earnings statistics
function calculateStats(earnings, startDate) {
  let totalSales = 0;
  let totalCommission = 0;
  let totalRefunds = 0;
  let totalPayouts = 0;
  
  earnings.forEach(earning => {
    const earningDate = new Date(earning.createdAt);
    
    // Filter by date range if startDate is provided
    if (startDate && earningDate < startDate) {
      return;
    }
    
    if (earning.type === 'SALE') {
      totalSales += earning.amount;
      totalCommission += earning.commission;
    } else if (earning.type === 'REFUND') {
      totalRefunds += Math.abs(earning.amount);
    } else if (earning.type === 'PAYOUT') {
      totalPayouts += Math.abs(earning.amount);
    }
  });
  
  const netEarnings = totalSales - totalRefunds - totalCommission;
  const availableBalance = netEarnings - totalPayouts;
  
  return {
    totalSales,
    totalCommission,
    totalRefunds,
    netEarnings,
    availableBalance,
    totalPayouts
  };
} 