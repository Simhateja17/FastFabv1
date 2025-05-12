import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/app/utils/adminAuth";
import axios from "axios";

export async function GET(request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const API_URL = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || "http://localhost:8000";
    
    // Forward the request to the backend
    const response = await axios.get(`${API_URL}/admin/price-adjustment/stats`, {
      headers: {
        Authorization: request.headers.get("Authorization"),
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching price adjustment stats:", error);
    return NextResponse.json(
      { 
        message: "Failed to fetch price adjustment statistics", 
        error: error.message,
        details: error.response?.data || "No additional details"
      },
      { status: error.response?.status || 500 }
    );
  }
} 