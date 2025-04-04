import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Handles GET, PUT, DELETE for a specific product by ID
export async function GET(request, { params }) {
  const { id } = params;
  return handleProductIdRequest(request, 'GET', id);
}

export async function PUT(request, { params }) {
  const { id } = params;
  return handleProductIdRequest(request, 'PUT', id);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  return handleProductIdRequest(request, 'DELETE', id);
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
        console.log('Using access token from Authorization header');
      }
    }
    
    if (!accessToken) {
      console.error('No access token found in cookies or auth header');
      return NextResponse.json(
        { message: 'Authentication required. Please login again.' },
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
      // Log content type for debugging
      const contentType = response.headers.get('content-type') || 'unknown';
      console.log(`Seller service response content type: ${contentType}`);

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
      const contentType = response.headers.get('content-type') || 'unknown';
      
      // Check if response is HTML instead of JSON
      if (contentType.includes('text/html')) {
        const htmlContent = await response.text();
        console.error(`Received HTML error page from seller service:`, htmlContent.substring(0, 200) + '...');
        
        return NextResponse.json(
          { 
            message: "Server returned an HTML error page", 
            details: { 
              contentType,
              statusCode: response.status,
              preview: htmlContent.substring(0, 200) + '...'
            }
          },
          { status: 502 } // Bad Gateway
        );
      }
      
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
             errorDetails = { 
               errorText,
               contentType,
               statusCode: response.status
             };
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
      const contentType = response.headers.get('content-type') || 'unknown';
      
      // Check if successful response is not JSON
      if (!contentType.includes('application/json')) {
        console.warn(`Unexpected content type in successful response: ${contentType}`);
      }
      
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
      
      const contentType = response.headers.get('content-type') || 'unknown';
      console.error(`Failed to parse successful ${method} response:`, e, `Content-Type: ${contentType}`);
      
      try {
        const text = await response.text();
        console.log(`Response body preview: ${text.substring(0, 200)}`);
      } catch (textError) {
        console.log('Could not read response text');
      }
      
      return NextResponse.json(
        { 
          message: 'Operation completed but received invalid response format from seller service',
          details: { contentType, status: response.status }
        },
        { status: 502 } // Bad Gateway, as the downstream service sent unexpected success response
      );
    }
    
  } catch (error) {
    console.error(`Unhandled error in product ${method} operation for ID ${productId}:`, error);
    return NextResponse.json(
      { message: `Internal server error while processing product ${method}`, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
} 