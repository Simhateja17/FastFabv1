import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

/**
 * Gets the return window status of an order item
 */
export async function GET(request, { params }) {
  try {
    // Verify seller authentication using JWT
    const authResult = await auth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const sellerId = authResult.sellerId;
    const { itemId } = params;
    
    // Verify order item exists and belongs to the seller
    const orderItem = await prisma.orderItem.findUnique({
      where: { 
        id: itemId,
      },
      select: {
        id: true,
        returnWindowStatus: true,
        returnWindowStart: true,
        returnWindowEnd: true,
        returnedAt: true,
        earningsCredited: true,
        earningsCreditedAt: true,
        productName: true,
        quantity: true,
        price: true,
        size: true,
        color: true,
        sellerId: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    });

    if (!orderItem) {
      return NextResponse.json(
        { message: "Order item not found" },
        { status: 404 }
      );
    }
    
    // Check if the item belongs to the authenticated seller
    if (orderItem.sellerId !== sellerId) {
      return NextResponse.json(
        { message: "You are not authorized to access this order item" },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      orderItem,
    });
  } catch (error) {
    console.error("Error fetching order item return status:", error);
    return NextResponse.json(
      { message: "Failed to fetch order item return status", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Updates the return window status of an order item
 * This endpoint allows sellers to update the return status of their items
 */
export async function PATCH(request, { params }) {
  try {
    // Verify seller authentication using JWT
    const authResult = await auth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const sellerId = authResult.sellerId;
    const { itemId } = params;
    const { returnWindowStatus, notes } = await request.json();
    
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
    
    // Verify order item exists and belongs to the seller
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
    
    // Check if the item belongs to the authenticated seller
    if (existingOrderItem.sellerId !== sellerId) {
      return NextResponse.json(
        { message: "You are not authorized to update this order item" },
        { status: 403 }
      );
    }
    
    const updateData = {
      returnWindowStatus,
      updatedAt: new Date(),
    };
    
    // Add timestamp based on status
    if (returnWindowStatus === 'RETURNED') {
      updateData.returnedAt = new Date();
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
          updatedAt: new Date()
        }
      });
    }
    
    return NextResponse.json({
      message: "Order item return status updated successfully",
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