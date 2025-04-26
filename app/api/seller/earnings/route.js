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

    // Get items in return window with enhanced details
    const itemsInReturnWindow = await prisma.orderItem.findMany({
      where: {
        sellerId: sellerId,
        returnWindowStatus: 'ACTIVE',
      },
      include: {
        earnings: true,
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            isReturnable: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            }
          }
        }
      }
    });

    // Calculate amount in return window and enrich items with time remaining
    let returnWindowAmount = 0;
    const now = new Date();
    
    const enrichedItems = itemsInReturnWindow.map(item => {
      const itemAmount = item.price * item.quantity;
      returnWindowAmount += itemAmount;
      
      // Calculate time remaining in return window
      const endDate = item.returnWindowEnd ? new Date(item.returnWindowEnd) : null;
      const startDate = item.returnWindowStart ? new Date(item.returnWindowStart) : null;
      
      let timeRemaining = null;
      let progress = 0;
      
      if (endDate && startDate) {
        const totalWindowMs = endDate - startDate;
        const elapsedMs = now - startDate;
        const remainingMs = Math.max(0, endDate - now);
        
        progress = Math.min(100, Math.max(0, (elapsedMs / totalWindowMs) * 100));
        timeRemaining = {
          ms: remainingMs,
          hours: Math.floor(remainingMs / (1000 * 60 * 60)),
          minutes: Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)),
        };
      }
      
      return {
        ...item,
        timeRemaining,
        progress,
        amount: itemAmount
      };
    });

    // Calculate projected release dates
    const projectedReleases = enrichedItems.reduce((acc, item) => {
      if (!item.returnWindowEnd) return acc;
      
      const releaseDate = new Date(item.returnWindowEnd);
      const dateKey = releaseDate.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: releaseDate,
          totalAmount: 0,
          items: []
        };
      }
      
      acc[dateKey].totalAmount += item.amount;
      acc[dateKey].items.push({
        id: item.id,
        productName: item.product?.name || 'Unknown Product',
        amount: item.amount
      });
      
      return acc;
    }, {});

    // Query earnings by type
    const immediateEarnings = await prisma.sellerEarning.findMany({
      where: {
        sellerId: sellerId,
        type: 'IMMEDIATE'
      }
    });

    const postWindowEarnings = await prisma.sellerEarning.findMany({
      where: {
        sellerId: sellerId,
        type: 'POST_RETURN_WINDOW'
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
      "7days": calculateStats(earnings, immediateEarnings, postWindowEarnings, returnWindowAmount, sevenDaysAgo),
      "30days": calculateStats(earnings, immediateEarnings, postWindowEarnings, returnWindowAmount, thirtyDaysAgo),
      "90days": calculateStats(earnings, immediateEarnings, postWindowEarnings, returnWindowAmount, ninetyDaysAgo),
      "all": calculateStats(earnings, immediateEarnings, postWindowEarnings, returnWindowAmount, null)
    };
    
    return NextResponse.json({ 
      earnings, 
      immediateEarnings, 
      postWindowEarnings, 
      itemsInReturnWindow: enrichedItems,
      returnWindowAmount,
      projectedReleases,
      stats 
    });
    
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
function calculateStats(earnings, immediateEarnings, postWindowEarnings, returnWindowAmount, startDate) {
  let totalSales = 0;
  let totalCommission = 0;
  let totalRefunds = 0;
  
  let immediateEarningsTotal = 0;
  let postWindowEarningsTotal = 0;
  
  // Filter by date for all earnings
  const filteredEarnings = earnings.filter(earning => {
    const earningDate = new Date(earning.createdAt);
    return !startDate || earningDate >= startDate;
  });
  
  // Filter by date for immediate earnings
  const filteredImmediateEarnings = immediateEarnings.filter(earning => {
    const earningDate = new Date(earning.createdAt);
    return !startDate || earningDate >= startDate;
  });
  
  // Filter by date for post-window earnings
  const filteredPostWindowEarnings = postWindowEarnings.filter(earning => {
    const earningDate = new Date(earning.createdAt);
    return !startDate || earningDate >= startDate;
  });
  
  // Calculate immediate earnings total
  filteredImmediateEarnings.forEach(earning => {
    immediateEarningsTotal += earning.amount;
  });
  
  // Calculate post-window earnings total
  filteredPostWindowEarnings.forEach(earning => {
    postWindowEarningsTotal += earning.amount;
  });
  
  // Original calculations for backward compatibility
  filteredEarnings.forEach(earning => {
    if (earning.type === 'SALE') {
      totalSales += earning.amount;
      totalCommission += earning.commission || 0;
    } else if (earning.type === 'REFUND') {
      totalRefunds += Math.abs(earning.amount);
    }
  });
  
  const netEarnings = totalSales - totalRefunds - totalCommission;
  const availableBalance = netEarnings;
  
  return {
    totalSales,
    totalCommission,
    totalRefunds,
    netEarnings,
    availableBalance,
    immediateEarningsTotal,
    postWindowEarningsTotal,
    returnWindowAmount
  };
} 



