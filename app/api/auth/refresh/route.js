import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    console.log('Token refresh request received at /api/auth/refresh/');
    
    // Get refresh token from request or cookies
    let refreshToken;
    const cookieStore = cookies();
    const refreshCookie = cookieStore.get('refreshToken');
    
    // First try to get from cookies
    if (refreshCookie) {
      refreshToken = refreshCookie.value;
      console.log('Using refresh token from cookies');
    } else {
      // Fall back to request body
      try {
        const requestData = await request.json();
        refreshToken = requestData.refreshToken;
        console.log('Using refresh token from request body');
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return NextResponse.json(
          { message: 'Invalid request format' },
          { status: 400 }
        );
      }
    }
    
    if (!refreshToken) {
      console.error('No refresh token provided');
      return NextResponse.json(
        { message: 'Refresh token is required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    const refreshEndpoint = `${apiUrl}/api/auth/refresh`;
    
    console.log(`Forwarding refresh request to: ${refreshEndpoint}`);
    
    // Add retry mechanism for better reliability
    let response;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        response = await fetch(refreshEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
          // Add a reasonable timeout
          signal: AbortSignal.timeout(5000)
        });
        
        // If successful, break out of retry loop
        break;
      } catch (fetchError) {
        console.error(`Fetch attempt ${retryCount + 1} failed:`, fetchError.message);
        
        // If we've reached max retries, handle the error
        if (retryCount === maxRetries) {
          console.error('All refresh token fetch attempts failed');
          
          // Instead of failing completely, try to return the existing token info
          // This helps prevent unwanted logouts during temporary network issues
          return NextResponse.json({
            message: 'Token refresh could not complete due to network issues',
            maintainSession: true,
            networkError: true
          });
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
    
    console.log(`Refresh token response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to refresh token';
      let errorData = {};
      
      try {
        // Try to parse as JSON if possible
        errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
        console.error('Refresh token error:', errorData);
      } catch (e) {
        // If not JSON, use text as is
        console.error('Non-JSON error response from refresh token endpoint:', errorText);
      }
      
      // For 500-level errors, don't propagate the error in a way that causes logout
      if (response.status >= 500) {
        return NextResponse.json({
          message: 'Server error during token refresh',
          error: errorMessage,
          maintainSession: true,
          serverError: true
        }, { status: 200 }); // Return 200 to prevent automatic logout
      }
      
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Refresh token successful, tokens received');
    
    // Update cookies with new tokens - updated to use await
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set new access token cookie
    if (data.accessToken) {
      await cookieStore.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 120, // 2 hours in seconds to match backend
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
    
    // For server and network errors, don't trigger an automatic logout
    if (error.name === 'AbortError' || error instanceof TypeError) {
      return NextResponse.json({
        message: 'Network issue during token refresh',
        maintainSession: true,
        networkError: true
      }, { status: 200 }); // Return 200 to prevent automatic logout
    }
    
    return NextResponse.json(
      { message: 'Failed to refresh token', error: error.message },
      { status: 500 }
    );
  }
} 