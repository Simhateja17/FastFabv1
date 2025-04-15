import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";
import { sendCustomerOrderCancelledRefund } from "@/app/utils/notificationService";

const prisma = new PrismaClient();

// PATCH /api/admin/orders/:id/reject - Reject an order
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

    // Require rejection notes
    if (!adminNotes) {
      return NextResponse.json(
        { message: "Admin notes explaining rejection reason are required" },
        { status: 400 }
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

    // Update the order status in a transaction
    const [updatedOrder, paymentTransaction] = await prisma.$transaction([
      // 1. Update order status to CANCELLED
      prisma.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          adminProcessed: true,
          sellerConfirmed: false,
          adminNotes: adminNotes,
          cancelledAt: new Date(),
          // Only mark as refunded for paid orders
          ...(order.paymentStatus === "SUCCESSFUL" && order.paymentMethod !== "COD" 
            ? { paymentStatus: "REFUNDED" } 
            : {})
        },
      }),

      // 2. Create refund transaction record if payment was made
      ...(order.paymentStatus === "SUCCESSFUL" && order.paymentMethod !== "COD"
        ? [
            prisma.paymentTransaction.create({
              data: {
                userId: order.userId,
                orderId: order.id,
                amount: order.totalAmount,
                currency: "INR",
                status: "REFUNDED",
                paymentMethod: order.paymentMethod,
                transactionId: `refund_${Date.now()}`,
              },
            }),
          ]
        : []),
    ]);

    // Notify customer about cancellation (if they have a phone number)
    if (order.user?.phone) {
      try {
        await sendCustomerOrderCancelledRefund(order.user.phone, {
          customerName: order.user.name || "Customer",
          orderId: order.orderNumber || order.id,
          reason: adminNotes || "Items unavailable",
          refundAmount: order.paymentStatus === "SUCCESSFUL" && order.paymentMethod !== "COD"
            ? order.totalAmount
            : 0
        });
      } catch (notificationError) {
        console.error("Failed to send customer notification:", notificationError);
        // Continue processing even if notification fails
      }
    }

    return NextResponse.json({
      message: "Order rejected successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error rejecting order:", error);
    return NextResponse.json(
      { message: "Failed to reject order", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 