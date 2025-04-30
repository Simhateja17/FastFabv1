import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export async function GET(request) {
  try {
    // Verify seller authentication
    const authResult = await auth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (!authResult.sellerId) {
      return NextResponse.json(
        { error: "Seller authentication required" },
        { status: 403 }
      );
    }
    
    // Get sellerId from auth result
    const sellerId = authResult.sellerId;
    
    // Extract search parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30days";
    
    // Get backend URL from environment variable (server-side env variable)
    const backendUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    
    console.log(`[API Route] Forwarding earnings request to: ${backendUrl}/api/seller/earnings?period=${period}`);
    
    // Extract all cookies from the request to forward them
    const cookies = request.headers.get('cookie') || '';
    
    // Forward the request to the backend service
    const response = await fetch(`${backendUrl}/api/seller/earnings?period=${period}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward all cookies including auth tokens
        // Get the Authorization header if it exists
        ...(request.headers.get('Authorization') 
            ? { 'Authorization': request.headers.get('Authorization') } 
            : {})
      },
      // This ensures cookies are included in cross-origin requests
      credentials: 'include'
    });
    
    // Check if the response is successful
    if (!response.ok) {
      console.error(`[API Route] Backend responded with status: ${response.status}`);
      const errorText = await response.text();
      // If unauthorized, tell the frontend to redirect to login
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Authentication failed, please login again", redirect: "/seller/signin" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Backend error: ${errorText}` },
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    
    // Return the data to the frontend
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Error proxying seller earnings request:", error);
    return NextResponse.json(
      { error: `Failed to fetch earnings: ${error.message}` },
      { status: 500 }
    );
  }
} 



