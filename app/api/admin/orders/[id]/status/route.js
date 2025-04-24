import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// PATCH /api/admin/orders/:id/status - Update order status
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { status } = await request.json();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { message: "Status is required" },
        { status: 400 }
      );
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        // If the status is changing to CONFIRMED or ACCEPTED, mark as processed
        ...(["CONFIRMED", "ACCEPTED"].includes(status) && { 
          adminProcessed: true 
        }),
        // If cancelling the order, record cancel time
        ...(status === "CANCELLED" && { 
          cancelledAt: new Date() 
        }),
        // If delivering the order, record delivery time
        ...(status === "DELIVERED" && { 
          deliveredAt: new Date() 
        })
      },
    });

    return NextResponse.json({
      message: `Order status updated to ${status}`,
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { message: "Failed to update order status", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 