import { NextResponse } from 'next/server';

/**
 * GET handler for public product details
 * Route: /api/public/products/[id]
 */
export async function GET(request, { params }) {
  try {
    const { id: productId } = params;
    
    console.log(`Fetching public product details for ID: ${productId}`);
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Forward request to seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    const targetEndpoint = `/api/public/products/${productId}`;

    console.log(`Forwarding GET request to: ${apiUrl}${targetEndpoint}`);
    
    let response;
    try {
      response = await fetch(`${apiUrl}${targetEndpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log(`Seller service response status: ${response.status}`);
      
      if (!response) {
        throw new Error('No response received from seller service');
      }

    } catch (error) {
      console.error(`Error connecting to seller service at ${apiUrl}${targetEndpoint}:`, error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable', details: error.message },
        { status: 503 }
      );
    }

    // Handle non-200 responses
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      
      // Try to get error details
      let errorDetails = '';
      try {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          errorDetails = errorData.message || errorData.error || '';
        } else {
          errorDetails = await response.text();
        }
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }

      // Map common error codes
      switch (response.status) {
        case 404:
          return NextResponse.json(
            { error: 'Product not found or not available' },
            { status: 404 }
          );
        case 403:
          return NextResponse.json(
            { error: 'Product not available' },
            { status: 404 } // Map 403 to 404 for public routes
          );
        default:
          return NextResponse.json(
            { error: 'Failed to fetch product', details: errorDetails },
            { status: response.status }
          );
      }
    }

    // Parse and return the successful response
    try {
      const product = await response.json();
      return NextResponse.json(product);
    } catch (error) {
      console.error('Failed to parse product data:', error);
      return NextResponse.json(
        { error: 'Invalid response format from service' },
        { status: 502 }
      );
    }
    
  } catch (error) {
    console.error(`Unhandled error in public product fetch:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 