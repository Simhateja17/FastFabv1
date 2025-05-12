import { NextResponse } from 'next/server';
import axios from 'axios';
import { verifyAdminAuth } from '@/app/utils/adminAuth';
import { cookies } from 'next/headers';

// Get the seller service URL from environment variables
const SELLER_SERVICE_URL = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000';

// Get a single promo code by ID
export async function GET(request, { params }) {
  try {
    // Get the promo code ID from params
    const { id } = params;
    
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message }, 
        { status: authResult.status }
      );
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
    
    // If still no token, try to get it from authResult
    if (!token && authResult.token) {
      token = authResult.token;
    }
    
    // Make API call to seller service
    const response = await axios.get(`${SELLER_SERVICE_URL}/api/admin/promo-codes/${id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
    
  } catch (error) {
    console.error('Error fetching promo code:', error);
    
    // Return backend error if available, otherwise generic error
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || 'Failed to fetch promo code';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: statusCode });
  }
}

// Update a promo code
export async function PUT(request, { params }) {
  try {
    // Get the promo code ID from params
    const { id } = params;
    
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message }, 
        { status: authResult.status }
      );
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
    
    // If still no token, try to get it from authResult
    if (!token && authResult.token) {
      token = authResult.token;
    }
    
    // Make API call to seller service
    const response = await axios.put(`${SELLER_SERVICE_URL}/api/admin/promo-codes/${id}`, data, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
    
  } catch (error) {
    console.error('Error updating promo code:', error);
    
    // Return backend error if available, otherwise generic error
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || 'Failed to update promo code';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: statusCode });
  }
}

// Delete a promo code
export async function DELETE(request, { params }) {
  try {
    // Get the promo code ID from params
    const { id } = params;
    
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message }, 
        { status: authResult.status }
      );
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
    
    // If still no token, try to get it from authResult
    if (!token && authResult.token) {
      token = authResult.token;
    }
    
    // Make API call to seller service
    const response = await axios.delete(`${SELLER_SERVICE_URL}/api/admin/promo-codes/${id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
    
  } catch (error) {
    console.error('Error deleting promo code:', error);
    
    // Return backend error if available, otherwise generic error
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || 'Failed to delete promo code';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: statusCode });
  }
} 