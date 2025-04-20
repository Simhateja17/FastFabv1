import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/app/lib/auth";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Verify user authentication
    const authResult = await auth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Prepare filter
    const filter = {
      userId,
      ...(status ? { status } : {}),
    };

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            size: true,
            color: true,
            price: true,
          },
        },
        transactions: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    // Get total count
    const totalOrders = await prisma.order.count({
      where: filter,
    });

    return NextResponse.json({
      message: "Orders retrieved successfully",
      data: {
        orders,
        pagination: {
          total: totalOrders,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  } catch (error) {
    console.error("Orders retrieval error:", error);
    return NextResponse.json(
      { message: "Failed to retrieve orders" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 