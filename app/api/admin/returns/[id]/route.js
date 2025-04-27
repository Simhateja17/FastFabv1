import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const returnId = params.id;
    
    if (!returnId) {
      return NextResponse.json(
        { message: "Return ID is required" },
        { status: 400 }
      );
    }
    
    // Fetch the return request with related data
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });
    
    if (!returnRequest) {
      return NextResponse.json(
        { message: "Return request not found" },
        { status: 404 }
      );
    }
    
    // Get the related order details - get all items instead of filtering
    const order = await prisma.order.findUnique({
      where: { id: returnRequest.orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                sellingPrice: true,
                mrpPrice: true,
                isReturnable: true
              }
            },
            seller: {
              select: {
                id: true,
                shopName: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                pincode: true
              }
            }
          }
        },
        address: true
      }
    });
    
    // Find the relevant item - either match by product name or use the first item
    let relevantItem = null;
    if (order?.items?.length > 0) {
      if (returnRequest.productName) {
        // Try to find an item that matches the product name in the return request
        relevantItem = order.items.find(item => 
          item.productName.toLowerCase() === returnRequest.productName.toLowerCase()
        );
      }
      
      // If no match found or no product name specified, use the first item
      if (!relevantItem) {
        relevantItem = order.items[0];
      }
    }
    
    // Format the response with all necessary details
    const response = {
      returnRequest: {
        id: returnRequest.id,
        orderId: returnRequest.orderId,
        orderItemId: returnRequest.orderItemId,
        status: returnRequest.status,
        reason: returnRequest.reason,
        amount: returnRequest.amount,
        productName: returnRequest.productName,
        submittedAt: returnRequest.submittedAt
      },
      customer: {
        id: returnRequest.user.id,
        name: returnRequest.user.name,
        email: returnRequest.user.email,
        phone: returnRequest.user.phone
      },
      order: order ? {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        shippingAddress: order.address
      } : null,
      item: relevantItem ? {
        id: relevantItem.id,
        productName: relevantItem.productName,
        quantity: relevantItem.quantity,
        size: relevantItem.size,
        color: relevantItem.color,
        price: relevantItem.price,
        productImages: relevantItem.product?.images || [],
        returnWindowStatus: relevantItem.returnWindowStatus,
        returnedAt: relevantItem.returnedAt
      } : null,
      seller: relevantItem?.seller || null
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("Error fetching return request details:", error);
    return NextResponse.json(
      { message: "Failed to fetch return request details", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Handle updating the return request status
export async function PATCH(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const returnId = params.id;
    
    if (!returnId) {
      return NextResponse.json(
        { message: "Return ID is required" },
        { status: 400 }
      );
    }
    
    // Parse request body
    const { status, adminNotes } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { message: "Status is required" },
        { status: 400 }
      );
    }
    
    // Get the current return request to check its status
    const currentReturn = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!currentReturn) {
      return NextResponse.json(
        { message: "Return request not found" },
        { status: 404 }
      );
    }
    
    // Update the return request status
    const updatedReturn = await prisma.returnRequest.update({
      where: { id: returnId },
      data: { 
        status: status,
        // Add any other fields that need updating
      }
    });
    
    // If approved, update the order status to RETURNED
    if (status === "APPROVED" && currentReturn.status !== "APPROVED") {
      await prisma.order.update({
        where: { id: currentReturn.orderId },
        data: { status: "RETURNED" }
      });
      
      // Get all items for this order instead of trying to find by orderItemId
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: currentReturn.orderId }
      });
      
      // Update the first item or a matching item if available
      if (orderItems.length > 0) {
        let itemToUpdate = orderItems[0];
        
        // Try to find a matching item by product name if available
        if (currentReturn.productName) {
          const matchingItem = orderItems.find(item => 
            item.productName.toLowerCase() === currentReturn.productName.toLowerCase()
          );
          
          if (matchingItem) {
            itemToUpdate = matchingItem;
          }
        }
        
        await prisma.orderItem.update({
          where: { id: itemToUpdate.id },
          data: { 
            returnWindowStatus: "RETURNED",
            returnedAt: new Date()
          }
        });
      }
    }
    
    return NextResponse.json({ 
      message: `Return request ${status.toLowerCase()}`,
      returnRequest: updatedReturn
    });
    
  } catch (error) {
    console.error("Error updating return request:", error);
    return NextResponse.json(
      { message: "Failed to update return request", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 