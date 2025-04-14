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
    console.log(`Fetching orders for seller ID: ${sellerId}`);
    
    const { searchParams } = new URL(request.url);
    const querySellerId = searchParams.get("sellerId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Ensure the authenticated seller is requesting their own data
    if (querySellerId && querySellerId !== sellerId) {
      return NextResponse.json(
        { error: "Unauthorized to access this seller's orders" },
        { status: 403 }
      );
    }
    
    // Create where clause for filtering
    const orderWhereClause = {};
    
    // Add status filter if provided
    if (status && status !== "all") {
      orderWhereClause.status = status.toUpperCase();
    }
    
    // Method 1: Use primarySellerId for direct orders lookup (added in our migration)
    console.log("Method 1: Fetching orders using primarySellerId relation");
    const primarySellerOrders = await prisma.order.findMany({
      where: {
        ...orderWhereClause,
        primarySellerId: sellerId
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        shippingAddress: true,
        items: {
          where: {
            sellerId: sellerId
          },
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            size: true,
            color: true,
            price: true,
            discount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });
    
    console.log(`Found ${primarySellerOrders.length} orders with primarySellerId = ${sellerId}`);
    
    // Convert to Map for easy merging
    const ordersMap = new Map();
    primarySellerOrders.forEach(order => {
      ordersMap.set(order.id, order);
    });

    // Method 2: Also fetch orders via orderItems relation (traditional approach)
    console.log("Method 2: Fetching orders through orderItems relation");
    const orderItems = await prisma.orderItem.findMany({
      where: {
        sellerId: sellerId
      },
      select: {
        id: true,
        orderId: true,
        order: {
          where: orderWhereClause,  // Apply status filter
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            shippingAddress: true
          }
        },
        productId: true,
        productName: true,
        quantity: true,
        size: true,
        color: true,
        price: true,
        discount: true
      }
    });
    
    // Process items to build orders
    console.log(`Found ${orderItems.length} order items for seller ${sellerId}`);
    
    orderItems.forEach(item => {
      if (!item.order) {
        console.warn(`Order not found for orderItem ${item.id}, orderId ${item.orderId}`);
        return; // Skip this item as its order is missing
      }
      
      // Add order to map if not already present
      if (!ordersMap.has(item.orderId)) {
        ordersMap.set(item.orderId, {
          id: item.order.id,
          orderNumber: item.order.orderNumber,
          totalAmount: item.order.totalAmount,
          status: item.order.status,
          paymentStatus: item.order.paymentStatus,
          paymentMethod: item.order.paymentMethod,
          createdAt: item.order.createdAt,
          updatedAt: item.order.updatedAt,
          user: item.order.user,
          shippingAddress: item.order.shippingAddress,
          items: []
        });
      }
      
      // Add item to order's items array
      const itemData = {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price,
        discount: item.discount
      };
      
      // Check if item is already in the array to avoid duplicates
      const existing = ordersMap.get(item.orderId).items.find(i => i.id === item.id);
      if (!existing) {
        ordersMap.get(item.orderId).items.push(itemData);
      }
    });
    
    // Method 3: Find and fix orders with missing sellerId
    console.log("Method 3: Checking for orders with missing sellerId references");
    const sellerProducts = await prisma.product.findMany({
      where: { sellerId },
      select: { id: true }
    });
    
    const productIds = sellerProducts.map(product => product.id);
    console.log(`Found ${productIds.length} products belonging to seller ${sellerId}`);
    
    if (productIds.length > 0) {
      // Find order items that contain the seller's products but might not have sellerId properly set
      const additionalItems = await prisma.orderItem.findMany({
        where: {
          productId: { in: productIds },
          sellerId: null, // Items where sellerId wasn't set
          order: orderWhereClause  // Apply status filter
        },
        select: {
          id: true,
          orderId: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              paymentStatus: true,
              paymentMethod: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              },
              shippingAddress: true
            }
          },
          productId: true,
          productName: true,
          quantity: true,
          size: true,
          color: true,
          price: true,
          discount: true
        }
      });
      
      console.log(`Found ${additionalItems.length} additional order items with seller's products but missing sellerId`);
      
      // Process these items to update sellerId and add to orders map
      const updates = [];
      for (const item of additionalItems) {
        if (!item.order) continue;
        
        // Schedule update for sellerId
        updates.push(
          prisma.orderItem.update({
            where: { id: item.id },
            data: { sellerId }
          })
        );
        
        // Add to our orders map if not already present
        if (!ordersMap.has(item.orderId)) {
          ordersMap.set(item.orderId, {
            id: item.order.id,
            orderNumber: item.order.orderNumber,
            totalAmount: item.order.totalAmount,
            status: item.order.status,
            paymentStatus: item.order.paymentStatus,
            paymentMethod: item.order.paymentMethod,
            createdAt: item.order.createdAt,
            updatedAt: item.order.updatedAt,
            user: item.order.user,
            shippingAddress: item.order.shippingAddress,
            items: []
          });
        }
        
        // Add the item to the order's items array
        const itemData = {
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          price: item.price,
          discount: item.discount
        };
        
        const existing = ordersMap.get(item.orderId).items.find(i => i.id === item.id);
        if (!existing) {
          ordersMap.get(item.orderId).items.push(itemData);
        }
      }
      
      // Run updates in parallel if there are any
      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`Updated sellerId for ${updates.length} previously missing seller references`);
        
        // Update primarySellerId for newly found orders if needed
        const orderIdsToUpdate = [...new Set(additionalItems.map(item => item.orderId))];
        console.log(`Checking ${orderIdsToUpdate.length} orders that need primarySellerId updated`);
        
        for (const orderId of orderIdsToUpdate) {
          // Check if order has primarySellerId set
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { primarySellerId: true }
          });
          
          if (!order.primarySellerId) {
            // Update the primarySellerId
            await prisma.order.update({
              where: { id: orderId },
              data: { primarySellerId: sellerId }
            });
            console.log(`Updated primarySellerId for order ${orderId} to ${sellerId}`);
          }
        }
      }
    }
    
    // Convert map to array and sort
    let orders = Array.from(ordersMap.values());
    
    // Sort by createdAt in descending order
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply limit/offset for pagination if needed
    if (limit > 0) {
      orders = orders.slice(offset, offset + limit);
    }
    
    console.log(`Returning ${orders.length} unique orders for seller ${sellerId}`);
    
    // Calculate stats for the response
    const allOrdersForStats = await prisma.order.findMany({
      where: {
        OR: [
          { primarySellerId: sellerId },
          {
            items: {
              some: {
                sellerId: sellerId
              }
            }
          }
        ]
      },
      select: {
        id: true,
        status: true
      }
    });
    
    const stats = {
      totalOrders: allOrdersForStats.length,
      pendingOrders: allOrdersForStats.filter(o => o.status === 'PENDING').length,
      processingOrders: allOrdersForStats.filter(o => o.status === 'PROCESSING').length,
      confirmedOrders: allOrdersForStats.filter(o => o.status === 'CONFIRMED').length,
      shippedOrders: allOrdersForStats.filter(o => o.status === 'SHIPPED').length,
      deliveredOrders: allOrdersForStats.filter(o => o.status === 'DELIVERED').length,
      cancelledOrders: allOrdersForStats.filter(o => o.status === 'CANCELLED').length
    };
    
    return NextResponse.json({ orders, stats });
    
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders", message: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 