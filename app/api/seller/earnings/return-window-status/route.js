import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

/**
 * GET /api/seller/earnings/return-window-status
 * 
 * Provides historical data on return window status transitions.
 * Shows items that have completed their return window or been returned.
 * 
 * Query Parameters:
 * - startDate: Filter by window end date (from this date)
 * - endDate: Filter by window end date (to this date)
 * - status: Filter by final status (COMPLETED, RETURNED, or all)
 * - page: Page number for pagination (default: 1)
 * - limit: Number of items per page (default: 20)
 */
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
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const status = searchParams.get("status"); // Can be 'COMPLETED', 'RETURNED', or null for all
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    // Build where clause
    const whereClause = {
      sellerId: sellerId,
      returnWindowStatus: {
        in: ['COMPLETED', 'RETURNED']
      }
    };
    
    // Add date filters if provided
    if (startDateParam) {
      const startDate = new Date(startDateParam);
      whereClause.returnWindowEnd = {
        ...(whereClause.returnWindowEnd || {}),
        gte: startDate
      };
    }
    
    if (endDateParam) {
      const endDate = new Date(endDateParam);
      whereClause.returnWindowEnd = {
        ...(whereClause.returnWindowEnd || {}),
        lte: endDate
      };
    }
    
    // Add status filter if provided
    if (status && ['COMPLETED', 'RETURNED'].includes(status)) {
      whereClause.returnWindowStatus = status;
    }
    
    // Query completed items with pagination
    const [items, totalCount] = await Promise.all([
      prisma.orderItem.findMany({
        where: whereClause,
        include: {
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
                  name: true
                }
              }
            }
          },
          earnings: {
            where: {
              type: 'POST_RETURN_WINDOW'
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          returnWindowEnd: 'desc' // Most recent transitions first
        }
      }),
      prisma.orderItem.count({ where: whereClause })
    ]);
    
    // Enrich items with additional information
    const enrichedItems = items.map(item => {
      const itemAmount = item.price * item.quantity;
      
      // Determine when the transition happened
      const transitionDate = item.returnWindowStatus === 'RETURNED' 
        ? item.returnedAt 
        : item.earningsCreditedAt || item.returnWindowEnd;
      
      // Calculate the amount that was credited to balance
      const creditedAmount = item.returnWindowStatus === 'COMPLETED' ? itemAmount : 0;
      
      // Find associated earnings record if any
      const earningRecord = item.earnings && item.earnings.length > 0 ? item.earnings[0] : null;
      
      return {
        id: item.id,
        orderId: item.orderId,
        orderNumber: item.order?.orderNumber,
        productName: item.product?.name || 'Unknown Product',
        amount: itemAmount,
        status: item.returnWindowStatus,
        transitionDate,
        formattedTransitionDate: formatDate(transitionDate),
        windowStartDate: item.returnWindowStart,
        windowEndDate: item.returnWindowEnd,
        creditedAmount,
        earningId: earningRecord?.id,
        earningAmount: earningRecord?.amount
      };
    });
    
    // Group by date
    const groupedByDate = enrichedItems.reduce((acc, item) => {
      const dateKey = new Date(item.transitionDate).toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: new Date(dateKey),
          formattedDate: formatDateShort(new Date(dateKey)),
          items: [],
          totalCreditedAmount: 0
        };
      }
      
      acc[dateKey].items.push(item);
      acc[dateKey].totalCreditedAmount += item.creditedAmount;
      
      return acc;
    }, {});
    
    // Convert grouped data to array and sort by date
    const groupedData = Object.values(groupedByDate).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    return NextResponse.json({
      transitions: enrichedItems,
      groupedByDate: groupedData,
      meta: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error("Error fetching return window transitions:", error);
    return NextResponse.json(
      { error: "Failed to fetch return window transitions" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to format date to a human-readable string
function formatDate(date) {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to format date in a shorter format
function formatDateShort(date) {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
} 