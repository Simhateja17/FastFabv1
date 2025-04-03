import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    console.log('Image upload request received');
    
    // Try to get token from both cookies and authorization header - updated to use async cookies API
    const cookieStore = cookies();
    let accessToken = (await cookieStore.get('accessToken'))?.value;
    
    // Try to get from authorization header if not in cookies
    if (!accessToken && request.headers.has('authorization')) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    console.log('Upload request authentication:', accessToken ? 'Token found' : 'No token found');
    
    if (!accessToken) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get form data from request
    console.log('Parsing form data from request');
    let formData;
    try {
      formData = await request.formData();
      console.log('Form data fields:', Array.from(formData.keys()));
    } catch (formError) {
      console.error('Error parsing form data:', formError);
      return NextResponse.json(
        { message: 'Failed to parse form data', error: formError.message },
        { status: 400 }
      );
    }
    
    // Check if image files are present
    const imageFiles = formData.getAll('images');
    console.log(`Found ${imageFiles.length} image files in request`);
    
    if (imageFiles.length === 0) {
      return NextResponse.json(
        { message: 'No image files provided' },
        { status: 400 }
      );
    }

    // Log file details for debugging
    console.log('Image file details:', imageFiles.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
    })));

    // Use the seller service URL
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    const uploadUrl = `${apiUrl}/api/products/upload-images`;
    console.log(`Forwarding upload request to: ${uploadUrl}`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload request timed out')), 30000)
    );
    
    // Fetch with timeout
    const fetchPromise = fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData,
    });
    
    // Race between fetch and timeout
    let response;
    try {
      response = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (fetchError) {
      console.error('Error during upload request:', fetchError);
      return NextResponse.json(
        { message: 'Failed to upload images', error: fetchError.message },
        { status: 500 }
      );
    }

    console.log(`Upload response status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    // Check response content type to handle different response formats
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      // Handle error response based on content type
      if (contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('Upload error (JSON):', errorData);
          return NextResponse.json(errorData, { status: response.status });
        } catch (e) {
          const text = await response.text();
          console.error('Failed to parse JSON error response:', text);
          return NextResponse.json(
            { message: 'Failed to upload images', error: 'Invalid server response' },
            { status: response.status }
          );
        }
      } else {
        // If it's HTML or another format, convert to a meaningful JSON error
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        return NextResponse.json(
          { message: 'Failed to upload images', error: 'Server returned a non-JSON response' },
          { status: response.status }
        );
      }
    }

    // Handle success response
    if (contentType.includes('application/json')) {
      try {
        const data = await response.json();
        console.log('Upload success data:', data);
        return NextResponse.json(data);
      } catch (e) {
        console.error('Failed to parse JSON success response');
        return NextResponse.json({
          message: 'Images uploaded but received invalid JSON response',
          success: true
        });
      }
    } else {
      // Handle unexpected success response format
      const text = await response.text();
      console.log('Non-JSON success response:', text);
      return NextResponse.json({
        message: 'Images uploaded but received unexpected response format',
        success: true
      });
    }
    
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { message: 'Failed to upload images', error: error.message },
      { status: 500 }
    );
  }
} 