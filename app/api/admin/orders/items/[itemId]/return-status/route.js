import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

/**
 * Updates the return window status of an order item by admin
 * This endpoint allows admins to update the return status of any order item
 */
export async function PATCH(request, { params }) {
  try {
    // Verify admin authentication using JWT
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const { itemId } = params;
    const { 
      returnWindowStatus, 
      notes, 
      setEarningsCredited = false,
      updateReturnWindow = false,
      returnWindowDays
    } = await request.json();
    
    if (!returnWindowStatus) {
      return NextResponse.json(
        { message: "Return window status is required" },
        { status: 400 }
      );
    }
    
    // Validate status enum value
    const validStatuses = ['NOT_APPLICABLE', 'ACTIVE', 'COMPLETED', 'RETURNED'];
    if (!validStatuses.includes(returnWindowStatus)) {
      return NextResponse.json(
        { 
          message: "Invalid return window status", 
          validValues: validStatuses 
        },
        { status: 400 }
      );
    }
    
    // Verify order item exists
    const existingOrderItem = await prisma.orderItem.findUnique({
      where: { 
        id: itemId,
      },
      include: {
        order: true
      }
    });

    if (!existingOrderItem) {
      return NextResponse.json(
        { message: "Order item not found" },
        { status: 404 }
      );
    }
    
    const updateData = {
      returnWindowStatus,
      updatedAt: new Date(),
    };
    
    // Set return window dates if requested
    if (updateReturnWindow && returnWindowStatus === 'ACTIVE') {
      const days = returnWindowDays || 7; // Default to 7 days if not specified
      const now = new Date();
      updateData.returnWindowStart = now;
      
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + days);
      updateData.returnWindowEnd = endDate;
    }
    
    // Add timestamp based on status
    if (returnWindowStatus === 'RETURNED') {
      updateData.returnedAt = new Date();
    }
    
    // Handle earnings credited status
    if (setEarningsCredited) {
      updateData.earningsCredited = true;
      updateData.earningsCreditedAt = new Date();
    }
    
    // Update the order item return status
    const updatedOrderItem = await prisma.orderItem.update({
      where: { 
        id: itemId 
      },
      data: updateData
    });
    
    // If the parent order needs updating based on return status, handle it here
    if (notes) {
      await prisma.order.update({
        where: { id: existingOrderItem.orderId },
        data: {
          adminNotes: notes,
          updatedAt: new Date(),
          adminProcessed: true
        }
      });
    }
    
    return NextResponse.json({
      message: "Order item return status updated successfully by admin",
      orderItem: updatedOrderItem,
    });
  } catch (error) {
    console.error("Error updating order item return status:", error);
    return NextResponse.json(
      { message: "Failed to update order item return status", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 