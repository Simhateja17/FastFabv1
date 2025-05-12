import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    // Hi Bye
    // Fetch all the dashboard statistics in parallel
    const [
      sellersCount,
      productsCount,
      activeProductsCount,
      totalOrders,
      todayOrders,
      usersCount,
      returnsCount,
      revenue,
      recentSellers,
      recentProducts,
      recentOrders
    ] = await Promise.all([
      // Count all sellers
      prisma.seller.count(),
      
      // Count all products
      prisma.product.count(),
      
      // Count active products
      prisma.product.count({
        where: { isActive: true }
      }),
      
      // Count all orders
      prisma.order.count(),
      
      // Count today's orders
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Count all users
      prisma.user.count(),
      
      // Count returns using the ReturnRequest model instead of Orders
      prisma.returnRequest.count(),
      
      // Calculate total revenue - using only DELIVERED status (removed COMPLETED which doesn't exist)
      prisma.order.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          status: "DELIVERED"
        }
      }),
      
      // Get recent sellers
      prisma.seller.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          shopName: true,
          ownerName: true,
          phone: true,
          createdAt: true,
          isVisible: true
        }
      }),
      
      // Get recent products
      prisma.product.findMany({
        take: 6,
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          name: true,
          category: true,
          subcategory: true,
          sellingPrice: true,
          isActive: true,
          images: true,
          sellerId: true,
        }
      }),
      
      // Get recent orders
      prisma.order.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    ]);

    // Add seller information to recent products
    const productsWithSellers = await Promise.all(
      recentProducts.map(async (product) => {
        const seller = await prisma.seller.findUnique({
          where: { id: product.sellerId },
          select: {
            id: true,
            shopName: true
          }
        });
        
        return {
          ...product,
          seller
        };
      })
    );

    // Format the data to return
    const stats = {
      sellersCount,
      productsCount,
      activeProductsCount,
      totalOrders,
      totalRevenue: revenue._sum.totalAmount || 0,
      todayOrdersCount: todayOrders,
      usersCount,
      returnsCount
    };

    return NextResponse.json({
      stats,
      recentSellers,
      recentProducts: productsWithSellers,
      recentOrders
    });
    
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard statistics", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 