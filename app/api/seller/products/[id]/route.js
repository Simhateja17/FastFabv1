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
    const targetEndpoint = `/api/products/${productId}`; // Correct endpoint on the seller service

    console.log(`Forwarding ${method} request for product ${productId} to: ${apiUrl}${targetEndpoint}`);
    
    let response = null;
    try {
      response = await fetch(`${apiUrl}${targetEndpoint}`, {
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

      console.log(`Seller service response status: ${response.status}`);

      if (!response) {
        throw new Error('No response received from seller service');
      }

    } catch (error) {
      console.error(`Error forwarding request to ${apiUrl}${targetEndpoint}:`, error);
      return NextResponse.json(
        { message: `Error connecting to seller service`, error: error.message },
        { status: 502 } // Bad Gateway
      );
    }
    
    // Process the response
    if (!response.ok) {
      let errorMessage = `Failed to ${method.toLowerCase()} product via seller service`;
      let errorDetails = null;
      try {
        // Try to parse JSON error first
        errorDetails = await response.json();
        console.error(`Seller service error data (${response.status}):`, errorDetails);
        errorMessage = errorDetails.message || errorMessage;
      } catch (e) {
        // If not JSON, try to get text
        try {
          const errorText = await response.text();
          console.error(`Seller service error text (${response.status}):`, errorText);
          // Use text as details if available and not too long
          if (errorText && errorText.length < 500) {
             errorDetails = { errorText };
          }
        } catch (textError) {
          console.error('Failed to parse error response as JSON or text');
        }
      }
      
      return NextResponse.json(
        { message: errorMessage, details: errorDetails },
        { status: response.status } // Use the status code from the seller service
      );
    }

    // Handle successful response
    try {
      const data = await response.json();
      console.log(`Product ${method.toLowerCase()} operation successful for ID ${productId}`);
      
      return NextResponse.json(data);
    } catch (e) {
      // For DELETE operations, an empty 2xx response (like 204 No Content) is often successful
      // Check if the status is successful (2xx) before treating empty body as error
      if (method === 'DELETE' && response.status >= 200 && response.status < 300) {
        console.log(`Product DELETE operation successful for ID ${productId} with status ${response.status}`);
        // Return a standard success response as the body might be empty
        return NextResponse.json({ message: "Product deleted successfully", success: true }); 
      }
      
      console.error(`Failed to parse successful ${method} response:`, e);
      return NextResponse.json(
        { message: 'Operation completed but received invalid response format from seller service' },
        { status: 502 } // Bad Gateway, as the downstream service sent unexpected success response
      );
    }
    
  } catch (error) {
    console.error(`Unhandled error in product ${method} operation for ID ${productId}:`, error);
    return NextResponse.json(
      { message: `Internal server error while processing product ${method}`, error: error.message },
      { status: 500 }
    );
  }
} 