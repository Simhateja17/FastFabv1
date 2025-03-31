import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Get token from cookies or authorization header - updated to use async cookies API
    const cookieStore = cookies();
    let accessToken = (await cookieStore.get('accessToken'))?.value;
    
    // Try to get from authorization header if not in cookies
    if (!accessToken && request.headers.has('authorization')) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward request to seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    console.log(`Fetching seller profile from: ${apiUrl}/api/auth/profile`);
    
    const response = await fetch(`${apiUrl}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log(`Profile response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch profile';
      try {
        const errorData = await response.json();
        console.error('Profile error data:', errorData);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response from profile endpoint');
        try {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
        } catch (textError) {
          // Ignore if we can't get text
        }
      }
      
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Profile fetched successfully');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { message: 'Failed to fetch profile', error: error.message },
      { status: 500 }
    );
  }
} 