import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Get refresh token from request or cookies
    let refreshToken;
    const cookieStore = cookies();
    const refreshCookie = cookieStore.get('refreshToken');
    
    // First try to get from cookies
    if (refreshCookie) {
      refreshToken = refreshCookie.value;
    } else {
      // Fall back to request body
      const requestData = await request.json();
      refreshToken = requestData.refreshToken;
    }
    
    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh token is required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    
    // Use the correct path /api/auth/refresh
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to refresh token';
      let errorData = {};
      
      try {
        // Try to parse as JSON if possible
        errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If not JSON, use text as is
        console.error('Non-JSON error response from refresh token endpoint:', errorText);
      }
      
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Update cookies with new tokens - updated to use await
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set new access token cookie
    if (data.accessToken) {
      await cookieStore.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 15, // 15 minutes in seconds
        path: '/',
      });
    }
    
    // Set new refresh token cookie if provided
    if (data.refreshToken) {
      await cookieStore.set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
        path: '/',
      });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { message: 'Failed to refresh token', error: error.message },
      { status: 500 }
    );
  }
} 