import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// GET all orders (for superadmin dashboard)
export async function GET(request) {
  try {
    // Verify admin authentication using JWT
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const search = searchParams.get('search');
    
    // Calculate pagination values
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        // Remove user-related search criteria as we'll handle that differently
      ];
    }
    
    // Build order by object
    const orderBy = {};
    orderBy[sort] = order;

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        updatedAt: true,
        estimatedDelivery: true,
        deliveredAt: true,
        cancelledAt: true,
        shippingFee: true,
        discount: true,
        tax: true,
        notes: true,
        deliveryNotes: true,
        trackingNumber: true,
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            sellerId: true,
            quantity: true,
            size: true,
            color: true,
            price: true,
            discount: true
          }
        }
      }
    });
    
    // Get user information and enhance order data
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        // Get user information for this order
        const user = await prisma.user.findUnique({
          where: { id: order.userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        });
        
        // Add seller information to order items
        const itemsWithSellers = await Promise.all(
          order.items.map(async (item) => {
            const seller = await prisma.seller.findUnique({
              where: { id: item.sellerId },
              select: {
                id: true,
                shopName: true,
                phone: true
              }
            });
            
            return {
              ...item,
              seller
            };
          })
        );
        
        return {
          ...order,
          user,
          items: itemsWithSellers
        };
      })
    );
    
    // Get total count for pagination
    const total = await prisma.order.count({ where });
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      orders: enhancedOrders,
      pagination: {
        total,
        page,
        limit,
        pages,
      }
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { message: "Failed to fetch orders", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}