import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export async function GET(request) {
  console.log(`[API Route] ⭐ Starting request handling at ${new Date().toISOString()}`);
  console.log(`[API Route] Request URL: ${request.url}`);
  
  try {
    // Verify seller authentication
    console.log(`[API Route] Attempting authentication...`);
    
    // --> Read the token first, as auth() doesn't return it on success <--
    const cookieStore = await require('next/headers').cookies();
    const verifiedAccessToken = cookieStore.get('accessToken')?.value;
    
    const authResult = await auth(request);
    console.log(`[API Route] Auth result: ${JSON.stringify({
      success: authResult.success,
      hasSellerID: !!authResult.sellerId
    })}`);
    
    if (!authResult.success) {
      console.log(`[API Route] ❌ Authentication failed`);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (!authResult.sellerId) {
      console.log(`[API Route] ❌ No seller ID found`);
      return NextResponse.json(
        { error: "Seller authentication required" },
        { status: 403 }
      );
    }
    
    // Get sellerId from auth result
    const sellerId = authResult.sellerId;
    console.log(`[API Route] ✅ Authenticated as seller: ${sellerId}`);
    
    // Extract search parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30days";
    console.log(`[API Route] Period parameter: ${period}`);
    
    // Get backend URL from environment variable
    const backendUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    console.log(`[API Route] 🔗 Backend URL: ${backendUrl}`);
    
    // Extract all cookies from the request to forward them
    const cookies = request.headers.get('cookie') || '';
    console.log(`[API Route] Cookie header present: ${!!cookies}`);
    
    // Prepare authorization header from cookies if needed
    let authHeader = request.headers.get('Authorization');
    
    // --> Use the verified token directly if auth succeeded and header wasn't present <--
    if (!authHeader && authResult.success && verifiedAccessToken) {
        console.log(`[API Route] Using verified accessToken from auth() for Authorization header.`);
        authHeader = `Bearer ${verifiedAccessToken}`;
    }
    
    // Log the full request we're about to make
    const targetUrl = `${backendUrl}/api/seller/earnings?period=${period}`;
    console.log(`[API Route] 🚀 Sending request to: ${targetUrl}`);
    
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      credentials: 'include'
    };
    
    console.log(`[API Route] Request headers: ${JSON.stringify(fetchOptions.headers)}`);
    
    let response;
    try {
      console.log(`[API Route] Fetching from backend...`);
      response = await fetch(targetUrl, fetchOptions);
      console.log(`[API Route] Backend responded with status: ${response.status}`);
    } catch (fetchError) {
      console.error(`[API Route] ❌ Fetch error: ${fetchError.message}`);
      return NextResponse.json(
        { error: `Network error: ${fetchError.message}` },
        { status: 500 }
      );
    }
    
    // Check if the response is successful
    if (!response.ok) {
      console.error(`[API Route] ❌ Backend error response: ${response.status}`);
      
      let errorText;
      try {
        errorText = await response.text();
        console.error(`[API Route] Error response body: ${errorText}`);
      } catch (textError) {
        console.error(`[API Route] Could not read error response: ${textError.message}`);
        errorText = "Could not read error response";
      }
      
      // If unauthorized, tell the frontend to redirect to login
      if (response.status === 401) {
        console.log(`[API Route] 🔄 Returning redirect for unauthorized`);
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
    let data;
    try {
      console.log(`[API Route] Parsing JSON response...`);
      data = await response.json();
      console.log(`[API Route] Successfully parsed JSON with keys: ${Object.keys(data).join(', ')}`);
    } catch (jsonError) {
      console.error(`[API Route] ❌ JSON parse error: ${jsonError.message}`);
      return NextResponse.json(
        { error: `Failed to parse backend response: ${jsonError.message}` },
        { status: 500 }
      );
    }
    
    // Return the data to the frontend with cache control headers
    console.log(`[API Route] ✅ Successfully returning data to frontend`);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error(`[API Route] ❌ Unhandled error: ${error.message}`);
    console.error(error.stack);
    return NextResponse.json(
      { error: `Failed to fetch earnings: ${error.message}` },
      { status: 500 }
    );
  }
} 



