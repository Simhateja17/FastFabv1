import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export async function POST(request) {
  console.log(`[Withdraw API Route] ⭐ Starting request handling at ${new Date().toISOString()}`);
  
  try {
    // Verify seller authentication
    console.log(`[Withdraw API Route] Attempting authentication...`);
    const authResult = await auth(request);
    console.log(`[Withdraw API Route] Auth result:`, JSON.stringify({
      success: authResult.success,
      hasSellerID: !!authResult.sellerId
    }));
    
    if (!authResult.success) {
      console.log(`[Withdraw API Route] ❌ Authentication failed`);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (!authResult.sellerId) {
      console.log(`[Withdraw API Route] ❌ No seller ID found`);
      return NextResponse.json(
        { error: "Seller authentication required" },
        { status: 403 }
      );
    }
    
    // Get backend URL from environment variable
    const backendUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    console.log(`[Withdraw API Route] 🔗 Backend URL: ${backendUrl}`);
    
    // Get request body
    const requestData = await request.json();
    console.log(`[Withdraw API Route] Request data:`, JSON.stringify(requestData));
    
    // Extract cookies to forward
    const cookies = request.headers.get('cookie') || '';
    console.log(`[Withdraw API Route] Cookie header present: ${!!cookies}`);
    
    // Forward request to backend
    const targetUrl = `${backendUrl}/api/seller/payouts/withdraw`;
    console.log(`[Withdraw API Route] 🚀 Sending request to: ${targetUrl}`);
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        ...(request.headers.get('Authorization') ? 
            { 'Authorization': request.headers.get('Authorization') } : {})
      },
      body: JSON.stringify(requestData),
      credentials: 'include'
    };
    
    console.log(`[Withdraw API Route] Request headers:`, JSON.stringify(fetchOptions.headers));
    
    let response;
    try {
      console.log(`[Withdraw API Route] Fetching from backend...`);
      response = await fetch(targetUrl, fetchOptions);
      console.log(`[Withdraw API Route] Backend responded with status: ${response.status}`);
    } catch (fetchError) {
      console.error(`[Withdraw API Route] ❌ Fetch error: ${fetchError.message}`);
      return NextResponse.json(
        { error: `Network error: ${fetchError.message}` },
        { status: 500 }
      );
    }
    
    // Return backend response
    if (!response.ok) {
      console.error(`[Withdraw API Route] ❌ Backend error response: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.text();
        console.error(`[Withdraw API Route] Error response body: ${errorData}`);
      } catch (textError) {
        console.error(`[Withdraw API Route] Could not read error response: ${textError.message}`);
        errorData = "Could not read error response";
      }
      
      return NextResponse.json(
        { error: errorData },
        { status: response.status }
      );
    }
    
    // Parse successful response
    let data;
    try {
      console.log(`[Withdraw API Route] Parsing JSON response...`);
      data = await response.json();
      console.log(`[Withdraw API Route] Successfully parsed JSON response`);
    } catch (jsonError) {
      console.error(`[Withdraw API Route] ❌ JSON parse error: ${jsonError.message}`);
      return NextResponse.json(
        { error: `Failed to parse backend response: ${jsonError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`[Withdraw API Route] ✅ Successfully returning data to frontend`);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error(`[Withdraw API Route] ❌ Unhandled error: ${error.message}`);
    console.error(error.stack);
    return NextResponse.json(
      { error: `Withdrawal request failed: ${error.message}` },
      { status: 500 }
    );
  }
} 