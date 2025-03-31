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
    
    // Try different endpoints that might exist in the seller service
    const endpoints = [
      '/api/products', 
      '/api/seller/products',
      '/api/products/seller'
    ];
    
    let response = null;
    let foundEndpoint = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      console.log(`Trying to fetch seller products from: ${apiUrl}${endpoint}`);
      
      try {
        response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          // Add any query parameters from the original request
          // This preserves filters, pagination, etc.
          ...(request.url.includes('?') ? { 
            next: { revalidate: 0 } // Ensure we don't cache
          } : {})
        });
        
        console.log(`Endpoint ${endpoint} response: ${response.status}`);
        
        // If we got a successful response or a meaningful error (not 404), use this endpoint
        if (response.status !== 404) {
          foundEndpoint = endpoint;
          break;
        }
      } catch (error) {
        console.error(`Error trying endpoint ${endpoint}:`, error);
      }
    }
    
    // If no endpoints worked, return an error
    if (!foundEndpoint) {
      console.error('All product endpoints returned 404, no valid endpoint found');
      return NextResponse.json(
        { 
          message: 'Failed to fetch products', 
          error: 'Product API endpoints not available'
        },
        { status: 404 }
      );
    }
    
    console.log(`Using product endpoint: ${foundEndpoint}`);
    
    // Process the response from the successful endpoint
    if (!response.ok) {
      let errorMessage = 'Failed to fetch products';
      try {
        const errorData = await response.json();
        console.error('Product fetch error data:', errorData);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response from products endpoint');
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

    // Handle successful response
    try {
      const data = await response.json();
      console.log('Products fetched successfully, count:', 
        data.products ? data.products.length : 'unknown');
      
      return NextResponse.json(data);
    } catch (e) {
      console.error('Failed to parse products response:', e);
      return NextResponse.json(
        { message: 'Invalid response format from server' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return NextResponse.json(
      { message: 'Failed to fetch products', error: error.message },
      { status: 500 }
    );
  }
}

// Also handle POST, PUT, DELETE for products
export async function POST(request) {
  return handleProductRequest(request, 'POST');
}

export async function PUT(request) {
  return handleProductRequest(request, 'PUT');
}

export async function DELETE(request) {
  return handleProductRequest(request, 'DELETE');
}

async function handleProductRequest(request, method) {
  try {
    // Get token from cookies or authorization header
    const cookieStore = cookies();
    let accessToken = (await cookieStore.get('accessToken'))?.value;
    
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

    // Get request body if needed
    let body = null;
    if (method !== 'GET' && method !== 'DELETE') {
      if (request.headers.get('content-type')?.includes('multipart/form-data')) {
        body = await request.formData();
      } else {
        body = await request.json();
      }
    }

    // Forward request to seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    
    // Similar to GET, try different potential endpoints
    const endpoints = [
      '/api/products', 
      '/api/seller/products',
      '/api/products/seller'
    ];
    
    let response = null;
    let foundEndpoint = null;
    
    for (const endpoint of endpoints) {
      console.log(`Trying to ${method} seller products to: ${apiUrl}${endpoint}`);
      
      try {
        response = await fetch(`${apiUrl}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...(body && !(body instanceof FormData) ? {
              'Content-Type': 'application/json'
            } : {})
          },
          body: body instanceof FormData ? body : JSON.stringify(body)
        });
        
        console.log(`Endpoint ${endpoint} response: ${response.status}`);
        
        if (response.status !== 404) {
          foundEndpoint = endpoint;
          break;
        }
      } catch (error) {
        console.error(`Error trying endpoint ${endpoint}:`, error);
      }
    }
    
    if (!foundEndpoint) {
      console.error(`All product endpoints returned 404 for ${method} operation`);
      return NextResponse.json(
        { 
          message: `Failed to ${method.toLowerCase()} product`, 
          error: 'Product API endpoints not available'
        },
        { status: 404 }
      );
    }
    
    console.log(`Using product endpoint for ${method}: ${foundEndpoint}`);
    
    // Process the response
    if (!response.ok) {
      let errorMessage = `Failed to ${method.toLowerCase()} product`;
      try {
        const errorData = await response.json();
        console.error(`Product ${method} error data:`, errorData);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        try {
          const errorText = await response.text();
          console.error(`Error response text for ${method}:`, errorText);
        } catch (textError) {
          // Ignore text errors
        }
      }
      
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    // Handle successful response
    try {
      const data = await response.json();
      console.log(`Product ${method.toLowerCase()} operation successful:`, data.id || 'unknown ID');
      
      return NextResponse.json(data);
    } catch (e) {
      console.error(`Failed to parse ${method} response:`, e);
      return NextResponse.json(
        { message: 'Operation completed but received invalid response format' },
        { status: 200 }
      );
    }
    
  } catch (error) {
    console.error(`Error in product ${method} operation:`, error);
    return NextResponse.json(
      { message: `Failed to ${method.toLowerCase()} product`, error: error.message },
      { status: 500 }
    );
  }
} 