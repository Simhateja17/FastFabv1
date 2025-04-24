import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const { orderId } = params;
    
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
    
    // Get order with all required details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        updatedAt: true,
        // Customer details
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        shippingAddress: true,
        // Order items
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
            discount: true,
            product: {
              select: {
                images: true,
                seller: {
                  select: {
                    id: true,
                    name: true,
                    shopName: true,
                    phone: true,
                    address: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }
    
    // Check if this seller has items in this order
    if (!order.items || order.items.length === 0) {
      return NextResponse.json(
        { error: "You don't have any items in this order" },
        { status: 403 }
      );
    }
    
    // Prepare the response with all requested information
    const orderDetails = {
      ...order,
      // Format customer details
      customer: {
        name: order.user?.name || "Unknown",
        email: order.user?.email || "Not provided",
        phone: order.user?.phone || "Not provided",
        address: order.shippingAddress || "Not provided"
      },
      // Format seller details from the first product's seller
      seller: order.items[0]?.product?.seller || null,
      // Format items with product details
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price,
        discount: item.discount,
        image: item.product?.images?.[0] || null
      }))
    };
    
    // Remove redundant nested data
    delete orderDetails.user;
    delete orderDetails.shippingAddress;
    
    return NextResponse.json({ order: orderDetails });
    
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details", message: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 