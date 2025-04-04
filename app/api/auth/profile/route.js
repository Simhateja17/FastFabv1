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
    
    // Add retry mechanism for better reliability
    let response;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          // Add a reasonable timeout
          signal: AbortSignal.timeout(5000)
        });
        
        // If successful, break out of retry loop
        break;
      } catch (fetchError) {
        console.error(`Profile fetch attempt ${retryCount + 1} failed:`, fetchError.message);
        
        // If we've reached max retries, handle the error
        if (retryCount === maxRetries) {
          console.error('All profile fetch attempts failed');
          
          // Instead of failing completely, return a non-fatal error
          // This prevents unwanted logouts during temporary network issues
          return NextResponse.json({
            message: 'Profile fetch could not complete due to network issues',
            maintainSession: true,
            networkError: true
          }, { status: 200 }); // Return 200 to prevent automatic logout
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
    
    console.log(`Profile response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid - this should trigger the refresh process
        return NextResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // For server errors, return a non-fatal error that won't cause logout
      if (response.status >= 500) {
        return NextResponse.json({
          message: 'Server error during profile fetch',
          maintainSession: true,
          serverError: true
        }, { status: 200 }); // Return 200 to prevent automatic logout
      }
      
      // For 404 errors (might be a routing issue), also prevent logout
      if (response.status === 404) {
        return NextResponse.json({
          message: 'Profile endpoint not found',
          maintainSession: true,
          routingError: true
        }, { status: 200 }); // Return 200 to prevent automatic logout
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
    
    // For network errors, don't trigger an automatic logout
    if (error.name === 'AbortError' || error instanceof TypeError) {
      return NextResponse.json({
        message: 'Network issue during profile fetch',
        maintainSession: true,
        networkError: true
      }, { status: 200 }); // Return 200 to prevent automatic logout
    }
    
    return NextResponse.json(
      { message: 'Failed to fetch profile', error: error.message },
      { status: 500 }
    );
  }
} 