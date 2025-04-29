import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

export async function GET(request) {
  // Get tab/status filter from query params
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  console.log('[REFUNDS API] Request received with status filter:', statusFilter);

  try {
    // Verify seller auth and get seller ID using the auth function
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
    
    const sellerId = authResult.sellerId;
    console.log('[REFUNDS API] Authenticated seller ID:', sellerId);

    // Get Return Requests where the seller's products were returned
    // We need to find ReturnRequests where the orderItem's sellerId matches our seller
    const returnRequests = await prisma.returnRequest.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        orderItem: {
          sellerId: sellerId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        orderItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    console.log('[REFUNDS API] Return requests found:', returnRequests.length);
    
    // DEBUGGING: Log the first request if available
    if (returnRequests.length > 0) {
      console.log('[REFUNDS API] Sample return request:', JSON.stringify(returnRequests[0], null, 2));
    }

    // Get orders that were directly marked as RETURNED 
    // (without going through the ReturnRequest process)
    // We need to find Order Items where:
    // 1. Order status is RETURNED
    // 2. The item's sellerId matches our seller
    // 3. There is no ReturnRequest record for this order (to avoid duplicates)
    
    // First get all order IDs that have return requests
    const existingOrderIdsWithReturnRequests = new Set(
      returnRequests.map((rr) => rr.orderId)
    );

    console.log('[REFUNDS API] Existing order IDs with return requests:', Array.from(existingOrderIdsWithReturnRequests));

    // Initialize returned orders array
    let returnedOrders = [];
    
    try {
      // Query returned orders carefully to avoid shippingAddress issue
      returnedOrders = await prisma.order.findMany({
        where: {
          status: "RETURNED",
          id: {
            notIn: Array.from(existingOrderIdsWithReturnRequests),
          },
          items: {
            some: {
              sellerId: sellerId,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            where: {
              sellerId: sellerId,
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              }
            },
          },
          // Include address if it exists as a relation
          address: true
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      console.log('[REFUNDS API] Returned orders found:', returnedOrders.length);
      
      // DEBUGGING: Log the first returned order if available
      if (returnedOrders.length > 0) {
        console.log('[REFUNDS API] Sample returned order:', JSON.stringify(returnedOrders[0], null, 2));
      }
    } catch (error) {
      console.error('[REFUNDS API] Error fetching returned orders:', error);
      // Continue with empty returned orders array instead of failing completely
      returnedOrders = [];
    }

    // Format return requests for the UI
    const formattedReturnRequests = returnRequests.map((request) => ({
      id: request.id,
      orderId: request.orderId,
      orderNumber: request.order?.orderNumber || 'N/A',
      orderItemId: request.orderItemId,
      customerName: request.user?.name || 'Unknown Customer',
      userId: request.userId,
      reason: request.reason,
      status: request.status,
      productName: request.productName || request.orderItem?.product?.name || 'Unknown Product',
      productImage: request.orderItem?.product?.images?.[0] || null,
      amount: request.amount,
      submittedAt: request.submittedAt,
      source: 'returnRequest', // Mark the source for filtering
    }));

    // Format returned orders for the UI - we'll only include them
    // if there's no status filter or the status is 'APPROVED'
    // since directly returned orders are essentially "approved returns"
    
    let formattedReturnedOrders = [];
    
    if (!statusFilter || statusFilter === 'APPROVED') {
      formattedReturnedOrders = returnedOrders.flatMap((order) => {
        // Get shipping address from different possible sources
        let shippingAddress = null;
        if (order.address) {
          shippingAddress = order.address;
        } else if (order.addressId) {
          // We already included address relation above, but this is a fallback
          console.log('[REFUNDS API] Order has addressId but no address relation:', order.addressId);
        } else if (order.address || order.city || order.state) {
          // In some schemas, address details are stored directly in order fields
          shippingAddress = {
            address: order.address || '',
            city: order.city || '',
            state: order.state || '',
            pincode: order.pincode || order.zipCode || ''
          };
        }
        
        return order.items.map((item) => ({
          id: `order-${order.id}-item-${item.id}`, // Create a unique ID
          orderId: order.id,
          orderNumber: order.orderNumber || 'N/A',
          orderItemId: item.id,
          customerName: order.user?.name || 'Unknown Customer',
          userId: order.userId,
          reason: 'Order marked as returned', // Default reason
          status: 'APPROVED', // Direct returns are considered approved
          productName: item.product?.name || 'Unknown Product',
          productImage: item.product?.images?.[0] || null, 
          amount: item.price,
          submittedAt: order.updatedAt, // Use order updated date as submitted date
          source: 'returnedOrder', // Mark the source for filtering
          shippingAddress // Include the shipping address if available
        }));
      });
    }

    // Combine both data sources
    const combinedRefunds = [
      ...formattedReturnRequests, 
      ...formattedReturnedOrders
    ].sort((a, b) => 
      new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    console.log('[REFUNDS API] Combined refunds count:', combinedRefunds.length);
    
    // DEBUGGING: Log a sample of the combined refund data
    if (combinedRefunds.length > 0) {
      console.log('[REFUNDS API] Sample combined refund data:', JSON.stringify(combinedRefunds[0], null, 2));
    }

    // Calculate statistics
    // For total refunds, we'll sum up approved returns in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Sum of all approved refunds in last 30 days
    const totalRefundsAmount = combinedRefunds
      .filter(
        (refund) => 
          refund.status === "APPROVED" && 
          new Date(refund.submittedAt) > thirtyDaysAgo
      )
      .reduce((total, refund) => total + (refund.amount || 0), 0);

    // Count of pending returns
    const pendingRefundsCount = combinedRefunds.filter(
      (refund) => refund.status === "PENDING"
    ).length;

    // Refund rate calculation requires total orders data 
    // Get total orders in last 30 days
    const totalOrdersLast30Days = await prisma.orderItem.count({
      where: {
        sellerId: sellerId,
        order: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      },
    });

    console.log('[REFUNDS API] Total orders in last 30 days:', totalOrdersLast30Days);

    // Calculate refund rate (approved returns / total orders) in percentage
    // Avoid division by zero
    const approvedRefundsLast30Days = combinedRefunds.filter(
      (refund) => 
        refund.status === "APPROVED" && 
        new Date(refund.submittedAt) > thirtyDaysAgo
    ).length;
    
    const refundRate = totalOrdersLast30Days > 0
      ? Math.round((approvedRefundsLast30Days / totalOrdersLast30Days) * 100)
      : 0;

    console.log('[REFUNDS API] Refund stats:', {
      totalRefundsAmount,
      pendingRefundsCount,
      approvedRefundsLast30Days,
      totalOrdersLast30Days,
      refundRate
    });

    // Return both the refunds data and stats
    return NextResponse.json({
      refunds: combinedRefunds,
      stats: {
        totalRefundsAmount,
        pendingRefundsCount,
        refundRate
      }
    });
  } catch (error) {
    console.error("[REFUNDS API] Error:", error);

    // Handle different error types
    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { message: "Authentication failed", details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Error processing refunds request", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 