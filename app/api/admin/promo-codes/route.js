import { NextResponse } from 'next/server';
import axios from 'axios';
import { verifyAdminAuth } from '@/app/utils/adminAuth';
import { cookies } from 'next/headers';

// Get the seller service URL from environment variables
const SELLER_SERVICE_URL = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000';

// Create a new promo code
export async function POST(request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.message }, { status: authResult.status });
    }

    // Parse request body
    const data = await request.json();
    
    // Get admin token - check multiple sources
    let token = request.headers.get('Authorization')?.split(' ')[1] || '';
    
    // If no token in headers, try to get from cookies
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('adminToken')?.value || 
              cookieStore.get('adminAccessToken')?.value ||
              cookieStore.get('token')?.value;
    }
    
    // If still no token, try to get it from localStorage via authResult
    if (!token && authResult.token) {
      token = authResult.token;
    }

    // Make sure we log what's happening for debugging
    console.log('Creating promo code with token present:', !!token);
    console.log('Using seller service URL:', SELLER_SERVICE_URL);
    
    // Make API call to seller service
    const response = await axios.post(`${SELLER_SERVICE_URL}/api/admin/promo-codes`, data, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);

  } catch (error) {
    console.error('Error creating promo code:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: { ...error.config?.headers, Authorization: 'REDACTED' }
      }
    });
    
    // Return backend error if available, otherwise generic error
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || 'Failed to create promo code';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: statusCode });
  }
}

// Get all promo codes
export async function GET(request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.message }, { status: authResult.status });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    // Build URL with query params
    let apiUrl = `${SELLER_SERVICE_URL}/api/admin/promo-codes`;
    if (isActive !== null && isActive !== undefined) {
      apiUrl += `?isActive=${isActive}`;
    }
    
    // Get admin token - check multiple sources
    let token = request.headers.get('Authorization')?.split(' ')[1] || '';
    
    // If no token in headers, try to get from cookies
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('adminToken')?.value || 
              cookieStore.get('adminAccessToken')?.value ||
              cookieStore.get('token')?.value;
    }
    
    // If still no token, try to get it from localStorage via authResult
    if (!token && authResult.token) {
      token = authResult.token;
    }
    
    // Debug logs
    console.log('Fetching promo codes with token present:', !!token);
    console.log('Using seller service URL:', SELLER_SERVICE_URL);
    console.log('API URL:', apiUrl);
    
    // Make API call to seller service
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);

  } catch (error) {
    console.error('Error fetching promo codes:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: { ...error.config?.headers, Authorization: 'REDACTED' }
      }
    });
    
    // Return backend error if available, otherwise generic error
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || 'Failed to fetch promo codes';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: statusCode });
  }
} 