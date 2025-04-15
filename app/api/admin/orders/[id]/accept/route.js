import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";
import { sendCustomerOrderConfirmed } from "@/app/utils/notificationService";

const prisma = new PrismaClient();

// PATCH /api/admin/orders/:id/accept - Accept an order
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { adminNotes } = await request.json();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true }
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
        status: "CONFIRMED",
        adminProcessed: true,
        sellerConfirmed: true,
        adminNotes: adminNotes || order.adminNotes,
      },
    });

    // Notify customer about order confirmation (if they have a phone number)
    if (order.user?.phone) {
      try {
        await sendCustomerOrderConfirmed(order.user.phone, {
          customerName: order.user.name || "Customer",
          orderId: order.orderNumber || order.id,
          estimatedDelivery: "3-5 business days"
        });
      } catch (notificationError) {
        console.error("Failed to send customer notification:", notificationError);
        // Continue processing even if notification fails
      }
    }

    return NextResponse.json({
      message: "Order accepted successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error accepting order:", error);
    return NextResponse.json(
      { message: "Failed to accept order", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 