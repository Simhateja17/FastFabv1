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
        { error: "Unauthorized to access this seller's orders" },
        { status: 403 }
      );
    }
    
    // Query to get all order items for this seller
    const orderItems = await prisma.orderItem.findMany({
      where: {
        sellerId: sellerId,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform data to group by orders
    const ordersMap = new Map();
    
    orderItems.forEach(item => {
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
      
      ordersMap.get(item.orderId).items.push({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price,
        discount: item.discount
      });
    });
    
    const orders = Array.from(ordersMap.values());
    
    return NextResponse.json({ orders });
    
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 