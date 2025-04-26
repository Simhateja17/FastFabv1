import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

/**
 * GET /api/seller/earnings/return-window
 * 
 * Provides detailed information about items in the return window
 * with filtering options for status, order ID, and pagination.
 * 
 * Query Parameters:
 * - status: Filter by return window status (ACTIVE, COMPLETED, RETURNED, NOT_APPLICABLE)
 * - orderId: Filter by specific order ID
 * - page: Page number for pagination (default: 1)
 * - limit: Number of items per page (default: 20)
 * - sortBy: Field to sort by (default: returnWindowEnd)
 * - sortDir: Sort direction (asc or desc, default: asc)
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
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE";
    const orderId = searchParams.get("orderId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "returnWindowEnd";
    const sortDir = searchParams.get("sortDir") || "asc";
    
    // Validate sortBy to prevent injection
    const validSortFields = ["returnWindowEnd", "returnWindowStart", "createdAt", "price"];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "returnWindowEnd";
    
    // Build where clause
    const whereClause = {
      sellerId: sellerId,
    };
    
    // Only add returnWindowStatus filter if it's not 'all'
    if (status !== "all") {
      whereClause.returnWindowStatus = status;
    }
    
    if (orderId) {
      whereClause.orderId = orderId;
    }
    
    // Query return window items with pagination
    const [items, totalCount] = await Promise.all([
      prisma.orderItem.findMany({
        where: whereClause,
        include: {
          earnings: true,
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              isReturnable: true,
              sellingPrice: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              status: true,
              paymentStatus: true,
              deliveredAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true
                }
              }
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [finalSortBy]: sortDir
        }
      }),
      prisma.orderItem.count({ where: whereClause })
    ]);
    
    // Enrich items with calculations
    const now = new Date();
    const enrichedItems = items.map(item => {
      const itemAmount = item.price * item.quantity;
      
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
          formattedTime: formatTimeRemaining(remainingMs)
        };
      }
      
      // Calculate projected release date if applicable
      let projectedRelease = null;
      if (item.returnWindowStatus === 'ACTIVE' && endDate) {
        projectedRelease = {
          date: endDate,
          formattedDate: formatDate(endDate)
        };
      }
      
      return {
        ...item,
        amount: itemAmount,
        timeRemaining,
        progress,
        projectedRelease
      };
    });
    
    return NextResponse.json({
      items: enrichedItems,
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
    console.error("Error fetching return window items:", error);
    return NextResponse.json(
      { error: "Failed to fetch return window items" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to format time remaining in a human-readable format
function formatTimeRemaining(ms) {
  if (ms <= 0) return "Expired";
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

// Helper function to format date to a human-readable string
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 