import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// GET /api/admin/sellers/:id - Get a specific seller by ID
export async function GET(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const { id } = params;
    
    // Find the seller with their products
    const seller = await prisma.seller.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true, 
            description: true,
            mrpPrice: true,
            sellingPrice: true,
            images: true,
            category: true,
            subcategory: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            colorInventory: true,
          },
        },
      },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(seller);
  } catch (error) {
    console.error("Error fetching seller details:", error);
    return NextResponse.json(
      { error: "Failed to fetch seller details" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/admin/sellers/:id - Update a seller
export async function PUT(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const { id } = params;
    const data = await request.json();

    // Allowed fields to update
    const allowedFields = [
      'phone', 'shopName', 'ownerName', 'address', 'city', 
      'state', 'pincode', 'openTime', 'closeTime', 'categories'
    ];

    // Filter to only include allowed fields
    const updatedData = Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    // Update the seller
    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: updatedData,
    });

    return NextResponse.json({ 
      message: "Seller updated successfully",
      seller: updatedSeller
    });
  } catch (error) {
    console.error("Error updating seller:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update seller" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 