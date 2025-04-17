import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from "@/app/lib/auth";

// Server-side error handler functions (direct implementations instead of imports)
function createErrorResponse(message, status = 500) {
  return NextResponse.json(
    { error: true, message },
    { status }
  );
}

function createSuccessResponse(data, status = 200) {
  return NextResponse.json(
    { error: false, ...data },
    { status }
  );
}

// Server-side error handler wrapper
function withErrorHandler(handler) {
  return async function(req, context) {
    try {
      // Call the original handler
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);

      // Ensure we return JSON instead of allowing Next.js to render an HTML error page
      return NextResponse.json(
        { 
          error: true, 
          message: error.message || 'An unexpected error occurred',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: error.status || 500 }
      );
    }
  };
}

export async function GET(request) {
  try {
    // Get the seller service URL from environment variables
    const sellerServiceUrl = process.env.SELLER_SERVICE_URL || 'https://seller-api.fastandfab.in';
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Forward the request to the seller service
    const response = await fetch(`${sellerServiceUrl}/api/products`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    // Get the response data
    const data = await response.json();

    // Forward the response status
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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