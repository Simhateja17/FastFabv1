import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Handles GET, PUT, DELETE for a specific product by ID
export async function GET(request, { params }) {
  return handleProductIdRequest(request, 'GET', params.id);
}

export async function PUT(request, { params }) {
  return handleProductIdRequest(request, 'PUT', params.id);
}

export async function DELETE(request, { params }) {
  return handleProductIdRequest(request, 'DELETE', params.id);
}

async function handleProductIdRequest(request, method, productId) {
  try {
    // Get token from cookies or authorization header - updated to use async cookies API
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
    
    // Try different potential endpoint patterns
    const endpoints = [
      `/api/products/${productId}`,
      `/api/seller/products/${productId}`,
      `/api/products/seller/${productId}`
    ];
    
    let response = null;
    let foundEndpoint = null;
    
    for (const endpoint of endpoints) {
      console.log(`Trying to ${method} product ${productId} at: ${apiUrl}${endpoint}`);
      
      try {
        response = await fetch(`${apiUrl}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...(body && !(body instanceof FormData) ? {
              'Content-Type': 'application/json'
            } : {})
          },
          body: method !== 'GET' && method !== 'DELETE' ? 
            (body instanceof FormData ? body : JSON.stringify(body)) : 
            undefined
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
      console.error(`All product endpoints returned 404 for ${method} operation on product ${productId}`);
      return NextResponse.json(
        { 
          message: `Failed to ${method.toLowerCase()} product`, 
          error: 'Product API endpoints not available'
        },
        { status: 404 }
      );
    }
    
    console.log(`Using product endpoint for ${method} on product ${productId}: ${foundEndpoint}`);
    
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
      console.log(`Product ${method.toLowerCase()} operation successful for ID ${productId}`);
      
      return NextResponse.json(data);
    } catch (e) {
      // For DELETE operations, an empty response might be fine
      if (method === 'DELETE') {
        return NextResponse.json({ success: true });
      }
      
      console.error(`Failed to parse ${method} response:`, e);
      return NextResponse.json(
        { message: 'Operation completed but received invalid response format' },
        { status: 200 }
      );
    }
    
  } catch (error) {
    console.error(`Error in product ${method} operation for ID ${productId}:`, error);
    return NextResponse.json(
      { message: `Failed to ${method.toLowerCase()} product`, error: error.message },
      { status: 500 }
    );
  }
} 