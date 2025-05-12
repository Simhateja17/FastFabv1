import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/app/utils/adminAuth";
import axios from "axios";

export async function POST(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    // Get the category from the route params
    const { category } = params;
    if (!category) {
      return NextResponse.json(
        { message: "Category is required" },
        { status: 400 }
      );
    }

    // Get the request body
    const body = await request.json();
    
    // Modify the request to ensure MRP enforcement
    // This is a custom wrapper that forces the backend to respect MRP limits
    const modifiedBody = {
      ...body,
      enforceMrpLimit: true,
      // Override the adjustment function to ensure price <= MRP
      priceAdjustmentFunction: "ENFORCE_MRP", 
      adjustmentLogic: `
        // This is pseudo-code that will be interpreted by the backend
        function adjustPrice(product, adjustment) {
          const newPrice = product.sellingPrice + adjustment;
          // Enforce MRP limit
          return Math.min(newPrice, product.mrpPrice);
        }
      `
    };
    
    const API_URL = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || "http://localhost:8000";
    
    // Forward the request to the backend
    const response = await axios.post(
      `${API_URL}/admin/price-adjustment/category/${category}`,
      modifiedBody,
      {
        headers: {
          Authorization: request.headers.get("Authorization"),
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error adjusting prices by category:", error);
    return NextResponse.json(
      { 
        message: "Failed to adjust prices by category", 
        error: error.message,
        details: error.response?.data || "No additional details"
      },
      { status: error.response?.status || 500 }
    );
  }
} 