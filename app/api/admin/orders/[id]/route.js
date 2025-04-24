import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// GET /api/admin/orders/:id - Get order details
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }

    // Find the order with all relevant details
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        // Include customer details
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        // Include order items with product details
        items: {
          include: {
            // Include product details
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                mrpPrice: true,
                sellingPrice: true,
                images: true,
                category: true,
                subcategory: true,
              },
            },
            // Include seller details for each item
            seller: {
              select: {
                id: true,
                shopName: true,
                ownerName: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                pincode: true,
              },
            },
          },
        },
        // Include primary seller if available
        primarySeller: {
          select: {
            id: true,
            shopName: true,
            ownerName: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
        // Include payment transactions
        transactions: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    // Fetch shipping address separately if addressId exists
    let shippingAddress = null;
    if (order.addressId) {
      shippingAddress = await prisma.address.findUnique({
        where: { id: order.addressId }
      });
    }

    // Add formatted fields for frontend display
    const formattedOrder = {
      ...order,
      shippingAddress, // Add the shipping address to the response
      formattedTotal: new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR' 
      }).format(order.totalAmount),
      formattedDate: new Date(order.createdAt).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      // Calculate and format delivery time estimate (if needed)
      estimatedDelivery: order.estimatedDelivery 
        ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN')
        : 'To be determined'
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { message: "Failed to fetch order details", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 