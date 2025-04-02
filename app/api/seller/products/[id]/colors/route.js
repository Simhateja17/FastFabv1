import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function handleProductColorsRequest(request, productId) {
  try {
    // 1. Get Authentication Token
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

    // 2. Forward Request to Seller Service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    // Correct endpoint on the seller service
    const targetEndpoint = `/api/products/${productId}/colors`; 

    console.log(`Forwarding GET request for product colors ${productId} to: ${apiUrl}${targetEndpoint}`);
    
    let response = null;
    try {
      response = await fetch(`${apiUrl}${targetEndpoint}`, {
        method: 'GET', // Explicitly GET for colors
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json' // Generally good practice
        }
      });

      console.log(`Seller service response status for colors: ${response.status}`);

      if (!response) {
        throw new Error('No response received from seller service for colors');
      }

    } catch (error) {
      console.error(`Error forwarding color request to ${apiUrl}${targetEndpoint}:`, error);
      return NextResponse.json(
        { message: `Error connecting to seller service for colors`, error: error.message },
        { status: 502 } // Bad Gateway
      );
    }
    
    // 3. Process the Response
    const responseBody = await response.text(); // Read body once
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch product colors via seller service (Status: ${response.status})`;
      let errorDetails = null;
      try {
        // Try to parse JSON error 
        errorDetails = JSON.parse(responseBody);
        console.error(`Seller service color error data (${response.status}):`, errorDetails);
        errorMessage = errorDetails.message || errorMessage;
      } catch (e) {
        // If not JSON, use the text body if available
        console.error(`Seller service color error text (${response.status}):`, responseBody);
        if (responseBody && responseBody.length < 500) {
           errorDetails = { errorText: responseBody };
        }
      }
      
      return NextResponse.json(
        { message: errorMessage, details: errorDetails },
        { status: response.status } 
      );
    }

    // Handle successful response (expecting JSON)
    try {
      const data = JSON.parse(responseBody); 
      console.log(`Product colors fetch successful for ID ${productId}`);
      return NextResponse.json(data); // Forward the JSON data
    } catch (e) {
      console.error(`Failed to parse successful colors response as JSON:`, e, `Response Body: ${responseBody}`);
      return NextResponse.json(
        { message: 'Received invalid response format for colors from seller service' },
        { status: 502 } 
      );
    }
    
  } catch (error) {
    console.error(`Unhandled error fetching colors for product ID ${productId}:`, error);
    return NextResponse.json(
      { message: `Internal server error while fetching product colors`, error: error.message },
      { status: 500 }
    );
  }
}

// Export the GET handler
export async function GET(request, { params }) {
  // params.id should contain the product ID from the URL
  return handleProductColorsRequest(request, params.id); 
} 