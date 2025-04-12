import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";

const prisma = new PrismaClient();

// GET /api/admin/products/:id - Get a specific product by ID
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
    
    // Find the product with its seller
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            phone: true,
            shopName: true,
            ownerName: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product details:", error);
    return NextResponse.json(
      { error: "Failed to fetch product details" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/admin/products/:id - Update a product
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
      'name', 'description', 'sellingPrice', 'mrpPrice', 
      'isActive', 'isReturnable', 'category', 'subcategory', 
      'images', 'sizeQuantities', 'colorInventory'
    ];

    // Filter to only include allowed fields
    const updatedData = Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        // Handle specific fields that need type conversion
        if (key === 'sellingPrice' || key === 'mrpPrice') {
          obj[key] = parseFloat(data[key]);
        } else if (key === 'isActive' || key === 'isReturnable') {
          obj[key] = Boolean(data[key]);
        } else {
          obj[key] = data[key];
        }
        return obj;
      }, {});

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updatedData,
      include: {
        seller: {
          select: {
            id: true,
            phone: true,
            shopName: true,
            ownerName: true,
          },
        },
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH /api/admin/products/:id/toggle-status - Toggle product status
export async function PATCH(request, { params }) {
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
    
    // Check if this is a toggle-status request (via URL pattern)
    const url = new URL(request.url);
    const isToggleStatus = url.pathname.endsWith('/toggle-status');
    
    if (isToggleStatus) {
      // Toggle the product status
      const { isActive } = data;
      
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { isActive },
      });
      
      return NextResponse.json({
        message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
        product: updatedProduct
      });
    } else {
      // Regular PATCH - update only provided fields
      const updatedProduct = await prisma.product.update({
        where: { id },
        data,
      });
      
      return NextResponse.json(updatedProduct);
    }
  } catch (error) {
    console.error("Error updating product status:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update product status" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 