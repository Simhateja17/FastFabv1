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
        address: {
          select: {
            id: true,
            name: true,
            phone: true,
            line1: true,
            line2: true,
            city: true,
            state: true,
            pincode: true,
            country: true
          }
        },
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
        sellerId: sellerId,
        order: orderWhereClause
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
            address: {
              select: {
                id: true,
                name: true,
                phone: true,
                line1: true,
                line2: true,
                city: true,
                state: true,
                pincode: true,
                country: true
              }
            }
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
          address: item.order.address,
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
          sellerId: { not: sellerId }, // Instead of null, find items not belonging to this seller
          order: {
            // Apply status filter here as a nested relation filter
            ...(status && status !== "all" ? { status: status.toUpperCase() } : {})
          }
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
              address: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  line1: true,
                  line2: true,
                  city: true,
                  state: true,
                  pincode: true,
                  country: true
                }
              }
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
      
      // Process these additional items
      additionalItems.forEach(item => {
        if (!item.order) {
          console.warn(`Order not found for additionalItem ${item.id}, orderId ${item.orderId}`);
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
            address: item.order.address,
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
    }
    
    // Convert map to array and apply pagination
    let allOrders = Array.from(ordersMap.values());
    
    // Sort by createdAt in descending order (most recent first)
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Count orders by status for stats
    const stats = {
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter(order => order.status === 'PENDING').length,
      deliveredOrders: allOrders.filter(order => order.status === 'DELIVERED').length,
      cancelledOrders: allOrders.filter(order => order.status === 'CANCELLED').length,
      confirmedOrders: allOrders.filter(order => order.status === 'CONFIRMED').length,
      shippedOrders: allOrders.filter(order => order.status === 'SHIPPED').length,
      processingOrders: allOrders.filter(order => order.status === 'PROCESSING').length
    };
    
    return NextResponse.json({ 
      orders: allOrders, 
      stats 
    });
    
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return NextResponse.json(
      { error: `Failed to fetch orders: ${error.message}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 