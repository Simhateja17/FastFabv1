import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Connection parameters for better reliability
const CONNECTION_CONFIG = {
  initialTimeout: 10000,     // Initial timeout in ms (10 seconds)
  maxRetries: 3,             // Maximum number of retry attempts
  baseRetryDelay: 500,       // Base delay for exponential backoff in ms
};

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
    
    // Initialize fetchParams with custom cache settings
    const fetchParams = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      // Don't use the browser's default cache
      cache: 'no-store'
    };
    
    // Add retry mechanism for better reliability
    let response;
    let retryCount = 0;
    const maxRetries = CONNECTION_CONFIG.maxRetries;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        // Create a new abort controller for each attempt
        const controller = new AbortController();
        const timeoutDuration = CONNECTION_CONFIG.initialTimeout * (1 + retryCount * 0.5); // Increase timeout on each retry
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutDuration);
        
        console.log(`Profile fetch attempt ${retryCount + 1} with timeout ${timeoutDuration}ms`);
        
        // Make the request with current timeout and abort controller
        response = await fetch(endpoint, {
          ...fetchParams,
          signal: controller.signal
        });
        
        // Clear the timeout to avoid abort after successful response
        clearTimeout(timeoutId);
        
        // If successful, break out of retry loop
        break;
      } catch (fetchError) {
        lastError = fetchError;
        console.error(`Profile fetch attempt ${retryCount + 1} failed:`, fetchError.message);
        
        // If we've reached max retries, handle the error
        if (retryCount === maxRetries) {
          console.error('All profile fetch attempts failed');
          
          // Instead of failing completely, return a non-fatal error with retry information
          return NextResponse.json({
            message: 'Profile fetch could not complete after multiple attempts',
            error: fetchError.message,
            attemptsMade: retryCount + 1,
            maintainSession: true,
            networkError: true
          }, { status: 200 }); // Return 200 to prevent automatic logout
        }
        
        // Wait before retrying (exponential backoff with jitter)
        const delay = Math.pow(2, retryCount) * CONNECTION_CONFIG.baseRetryDelay;
        // Add jitter to prevent synchronized retries (±20% randomness)
        const jitter = delay * 0.2 * (Math.random() - 0.5);
        const finalDelay = Math.floor(delay + jitter);
        
        console.log(`Retrying in ${finalDelay}ms (retry ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, finalDelay));
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
          status: response.status,
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
    
    // Add a timeout for the response parsing to prevent hanging
    let data;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
      console.log('Profile fetch successful');
    } catch (parseError) {
      console.error('Error parsing profile response:', parseError);
      return NextResponse.json({
        message: 'Error parsing profile data',
        error: parseError.message,
        maintainSession: true
      }, { status: 200 });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    
    // For network errors, don't trigger an automatic logout
    if (error.name === 'AbortError' || error instanceof TypeError) {
      return NextResponse.json({
        message: 'Network issue during profile fetch',
        maintainSession: true,
        networkError: true,
        error: error.message
      }, { status: 200 }); // Return 200 to prevent automatic logout
    }
    
    return NextResponse.json(
      { message: 'Failed to fetch profile', error: error.message },
      { status: 500 }
    );
  }
} 