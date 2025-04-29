import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    // Verify admin authentication using JWT
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const { id } = params;
    const { status, adminNotes } = await request.json();
    
    // Verify order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }
    
    const updateData = {
      updatedAt: new Date(),
      adminProcessed: true,
    };
    
    // Add status if provided
    if (status) {
      updateData.status = status;
    }
    
    // Add admin notes if provided
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    
    // If status is confirmed, also mark the order as seller confirmed
    if (status === "CONFIRMED") {
      updateData.sellerConfirmed = true;
    }
    
    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData
    });
    
    // If status is being updated to CONFIRMED, set return window for each item
    if (status === "CONFIRMED") {
      // Get all items for this order
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: id },
        include: { product: true }
      });
      
      // For each item, set return window if the product is returnable
      for (const item of orderItems) {
        if (item.product?.isReturnable) {
          const now = new Date();
          const returnWindowEnd = new Date(now);
          returnWindowEnd.setHours(returnWindowEnd.getHours() + 24); // 24 hour return window
          
          await prisma.orderItem.update({
            where: { id: item.id },
            data: {
              returnWindowStatus: 'ACTIVE',
              returnWindowStart: now,
              returnWindowEnd: returnWindowEnd
            }
          });
        }
      }
    }
    
    return NextResponse.json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { message: "Failed to update order", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request, { params }) {
  try {
    // Verify admin authentication using JWT
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const { id } = params;
    
    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: true,
            seller: {
              select: {
                id: true,
                shopName: true,
                firstName: true,
                lastName: true,
                phone: true,
              }
            }
          },
        },
        address: true,
        payment: {
          select: {
            id: true,
            status: true,
            paymentId: true,
            method: true,
            amount: true,
            createdAt: true,
          }
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { message: "Failed to fetch order", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 