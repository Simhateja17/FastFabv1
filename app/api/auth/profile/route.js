import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('Profile request received');
    
    // Extract token from Authorization header or cookies
    let token;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('Using token from Authorization header');
    } else {
      // Try to get from cookies
      const cookieStore = cookies();
      const accessTokenCookie = cookieStore.get('accessToken');
      
      if (accessTokenCookie) {
        token = accessTokenCookie.value;
        console.log('Using token from cookies');
      }
    }
    
    if (!token) {
      console.error('No token provided');
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Forward the request to the seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    const endpoint = `${apiUrl}/api/sellers/profile`;
    
    console.log(`Forwarding profile request to: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Profile response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        return NextResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Other error
      const errorText = await response.text();
      let errorMessage = 'Failed to fetch profile';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If not JSON, use text as is
        console.error('Non-JSON error response from profile endpoint:', errorText);
      }
      
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Profile fetch successful');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch profile', error: error.message },
      { status: 500 }
    );
  }
} 