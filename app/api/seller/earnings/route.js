import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

// Helper to determine the backend URL
function getBackendUrl() {
  // Use environment variable if defined, otherwise fallback to localhost in development
  return process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000';
}

export async function GET(request) {
  try {
    // 1. Verify seller authentication
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
    
    // 2. Get the period parameter from the request URL
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30days";
    
    // 3. Forward all authentication-related headers and cookies
    const cookieHeader = request.headers.get('cookie');
    const authHeader = request.headers.get('authorization');
    
    // 4. Determine the backend URL
    const backendUrl = getBackendUrl();
    
    // 5. Forward the request to the Express backend
    const apiUrl = `${backendUrl}/api/seller/earnings?period=${period}`;
    console.log(`[API Route] Proxying earnings request to: ${apiUrl}`);
    
    // Prepare headers to forward
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    
    // Forward Authorization header if present
    if (authHeader) {
      headers.append('Authorization', authHeader);
    }
    
    // Forward cookies if present (important for session-based auth)
    if (cookieHeader) {
      headers.append('Cookie', cookieHeader);
    }
    
    // Make the request to the backend, including credentials
    const backendResponse = await fetch(apiUrl, {
      headers,
      credentials: 'include', // Important: This forwards cookies in fetch requests
      mode: 'cors',           // Ensure CORS is properly handled
    });
    
    // If the backend returns an error, handle it
    if (!backendResponse.ok) {
      console.error(`[API Route] Backend returned error: ${backendResponse.status} ${backendResponse.statusText}`);
      
      // Try to get error details
      let errorData;
      try {
        errorData = await backendResponse.json();
      } catch (e) {
        errorData = { message: backendResponse.statusText };
      }
      
      // Log detailed error info to help with debugging
      console.error('[API Route] Backend error details:', errorData);
      
      return NextResponse.json(
        { error: errorData.message || "Failed to fetch earnings from backend" },
        { status: backendResponse.status }
      );
    }
    
    // Get the data from the backend response
    const data = await backendResponse.json();
    
    // 6. Return the backend data
    console.log(`[API Route] Successfully proxied earnings request`);
    
    // Create the response and forward any cookies from the backend
    const response = NextResponse.json(data);
    
    // Forward Set-Cookie headers from backend to client if present
    const backendCookies = backendResponse.headers.getSetCookie();
    if (backendCookies && backendCookies.length > 0) {
      backendCookies.forEach(cookie => {
        response.headers.append('Set-Cookie', cookie);
      });
    }
    
    return response;
    
  } catch (error) {
    console.error("[API Route] Error in earnings proxy:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings: " + error.message },
      { status: 500 }
    );
  }
}

// Keep the existing calculateStats function for fallback/reference
function calculateStats(earnings, immediateEarnings, postWindowEarnings, returnWindowAmount, startDate) {
  let totalSales = 0;
  let totalCommission = 0;
  let totalRefunds = 0;
  
  let immediateEarningsTotal = 0;
  let postWindowEarningsTotal = 0;
  
  // Filter by date for all earnings
  const filteredEarnings = earnings.filter(earning => {
    const earningDate = new Date(earning.createdAt);
    return !startDate || earningDate >= startDate;
  });
  
  // Filter by date for immediate earnings
  const filteredImmediateEarnings = immediateEarnings.filter(earning => {
    const earningDate = new Date(earning.createdAt);
    return !startDate || earningDate >= startDate;
  });
  
  // Filter by date for post-window earnings
  const filteredPostWindowEarnings = postWindowEarnings.filter(earning => {
    const earningDate = new Date(earning.createdAt);
    return !startDate || earningDate >= startDate;
  });
  
  // Calculate immediate earnings total
  filteredImmediateEarnings.forEach(earning => {
    immediateEarningsTotal += earning.amount;
  });
  
  // Calculate post-window earnings total
  filteredPostWindowEarnings.forEach(earning => {
    postWindowEarningsTotal += earning.amount;
  });
  
  // Original calculations for backward compatibility
  filteredEarnings.forEach(earning => {
    if (earning.type === 'SALE') {
      totalSales += earning.amount;
      totalCommission += earning.commission || 0;
    } else if (earning.type === 'REFUND') {
      totalRefunds += Math.abs(earning.amount);
    }
  });
  
  // Fix precision for all calculations
  totalSales = parseFloat(totalSales.toFixed(2));
  totalCommission = parseFloat(totalCommission.toFixed(2));
  totalRefunds = parseFloat(totalRefunds.toFixed(2));
  immediateEarningsTotal = parseFloat(immediateEarningsTotal.toFixed(2));
  postWindowEarningsTotal = parseFloat(postWindowEarningsTotal.toFixed(2));
  returnWindowAmount = parseFloat(returnWindowAmount.toFixed(2));
  
  // Calculate with fixed precision
  const netEarnings = parseFloat((totalSales - totalRefunds - totalCommission).toFixed(2));
  const availableBalance = parseFloat((netEarnings - returnWindowAmount).toFixed(2));
  
  return {
    totalSales,
    totalCommission,
    totalRefunds,
    netEarnings,
    availableBalance,
    immediateEarningsTotal,
    postWindowEarningsTotal,
    returnWindowAmount
  };
} 



