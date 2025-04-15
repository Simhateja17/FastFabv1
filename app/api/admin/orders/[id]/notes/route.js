import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// PATCH /api/admin/orders/:id/notes - Update admin notes for an order
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
      where: { id }
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    // Update just the admin notes
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        adminNotes
      },
    });

    return NextResponse.json({
      message: "Order notes updated successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order notes:", error);
    return NextResponse.json(
      { message: "Failed to update order notes", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 