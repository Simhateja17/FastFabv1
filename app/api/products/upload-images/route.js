import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Set this to the largest size you want to accept (in bytes)
// 20MB for now, can be increased if needed
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TOTAL_FILES_SIZE = 100 * 1024 * 1024; // 100MB total
const MAX_FILES = 10; // Maximum number of files per upload

export async function POST(request) {
  try {
    console.log('[UPLOAD] Image upload request received');
    console.log('[UPLOAD] Request method:', request.method);
    
    // Log headers without exposing sensitive data
    const safeHeaders = {};
    for (const [key, value] of request.headers.entries()) {
      // Don't log full authorization header values
      if (key.toLowerCase() === 'authorization') {
        safeHeaders[key] = value.startsWith('Bearer ') ? 'Bearer [REDACTED]' : value;
      } else {
        safeHeaders[key] = value;
      }
    }
    console.log('[UPLOAD] Request headers:', safeHeaders);
    
    // Try to get token from both cookies and authorization header - updated to use async cookies API
    const cookieStore = cookies();
    let accessToken = (await cookieStore.get('accessToken'))?.value;
    
    // Try to get from authorization header if not in cookies
    if (!accessToken && request.headers.has('authorization')) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log('[UPLOAD] Using token from Authorization header');
      }
    }
    
    console.log('[UPLOAD] Authentication status:', accessToken ? 'Token found' : 'No token found');
    
    if (!accessToken) {
      return NextResponse.json(
        { message: 'Authentication required to upload images' },
        { status: 401 }
      );
    }

    // Get form data from request
    console.log('[UPLOAD] Parsing form data from request');
    let formData;
    try {
      formData = await request.formData();
      console.log('[UPLOAD] Form data fields:', Array.from(formData.keys()));
    } catch (formError) {
      console.error('[UPLOAD] Error parsing form data:', formError);
      return NextResponse.json(
        { message: 'Failed to parse form data', error: formError.message },
        { status: 400 }
      );
    }
    
    // Check if image files are present
    const imageFiles = formData.getAll('images');
    console.log(`[UPLOAD] Found ${imageFiles.length} image files in request`);
    
    if (imageFiles.length === 0) {
      return NextResponse.json(
        { message: 'No image files provided' },
        { status: 400 }
      );
    }

    if (imageFiles.length > MAX_FILES) {
      return NextResponse.json(
        { message: `Too many files. Maximum allowed is ${MAX_FILES} files per upload.` },
        { status: 400 }
      );
    }

    // Validate all files first
    let totalSize = 0;
    for (const file of imageFiles) {
      totalSize += file.size;
      
      // Individual file size check
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: `File '${file.name}' is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
          { status: 400 }
        );
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { message: `File '${file.name}' is not an image. Only image files are allowed.` },
          { status: 400 }
        );
      }
    }
    
    // Total size check
    if (totalSize > MAX_TOTAL_FILES_SIZE) {
      return NextResponse.json(
        { message: `Total file size (${Math.round(totalSize / (1024 * 1024))}MB) exceeds the maximum allowed (${MAX_TOTAL_FILES_SIZE / (1024 * 1024)}MB).` },
        { status: 400 }
      );
    }

    // Log file details for debugging
    console.log('[UPLOAD] Image file details:', imageFiles.map(file => ({
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    })));

    // Use the seller service URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL;
    if (!apiUrl) {
      console.error("[UPLOAD] Error: NEXT_PUBLIC_SELLER_SERVICE_URL environment variable is not set.");
      return NextResponse.json(
        { message: "Server configuration error: Image service URL is missing." },
        { status: 500 } // Internal Server Error
      );
    }

    const uploadUrl = `${apiUrl}/api/products/upload-images`; // Ensure API path is appended correctly if base URL doesn't have it
    console.log(`[UPLOAD] Forwarding upload request to: ${uploadUrl}`);
    
    // Create a timeout promise with a longer timeout (2 minutes)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload request timed out after 2 minutes')), 120000)
    );
    
    // Forward the request to the seller service with proper timeout
    let response;
    try {
      console.log('[UPLOAD] Starting upload to seller service...');
      
      // Create a simple FormData with the files directly
      const forwardFormData = new FormData();
      
      // Append each file to the FormData
      for (const file of imageFiles) {
        console.log(`[UPLOAD] Adding file to forwarded request: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB, type: ${file.type}`);
        forwardFormData.append("images", file);
      }
      
      // Prepare request options - no custom content-type header for multipart forms
      const requestOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: forwardFormData,
      };
      
      // Add detailed connectivity testing
      console.log(`[UPLOAD] Testing connectivity to seller service: ${apiUrl}`);
      try {
        // First try a lightweight HEAD request to check connectivity
        const testResponse = await fetch(`${apiUrl}/api/health-check`, {
          method: 'HEAD',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(5000) // 5 second timeout just for the test
        });
        console.log(`[UPLOAD] Connectivity test result: ${testResponse.status} ${testResponse.statusText}`);
      } catch (testError) {
        console.warn(`[UPLOAD] Connectivity test failed: ${testError.message}`);
        // Continue with the actual upload despite the test failing
      }
      
      // Fetch with timeout - wrapped in try/catch for better error handling
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('Upload timed out after 120 seconds'), 120000);
        
        const fetchPromise = fetch(uploadUrl, {
          ...requestOptions,
          signal: controller.signal
        });
        
        try {
          response = await fetchPromise;
          clearTimeout(timeoutId);
        } catch (abortError) {
          console.error('[UPLOAD] Request aborted:', abortError);
          throw new Error(`Upload timed out or was aborted: ${abortError.message}`);
        }
      } catch (innerFetchError) {
        console.error('[UPLOAD] Network error during fetch:', innerFetchError);
        
        // Add more diagnostic info
        if (innerFetchError.name === 'TypeError') {
          console.error('[UPLOAD] This is likely a network connectivity issue. Check server URL and network.');
        } else if (innerFetchError.name === 'AbortError') {
          console.error('[UPLOAD] Request was aborted due to timeout or manual cancellation.');
        }
        
        throw new Error(`Network error during upload: ${innerFetchError.message}`);
      }
      
      console.log(`[UPLOAD] Response status: ${response.status} ${response.statusText}`);
      console.log(`[UPLOAD] Content-Type: ${response.headers.get('content-type')}`);
      
      // Log all response headers (safely)
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('[UPLOAD] Response headers:', responseHeaders);
      
    } catch (fetchError) {
      console.error('[UPLOAD] Error during upload request:', fetchError);
      
      // Provide more specific error messages based on the error type
      if (fetchError.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { message: 'Failed to connect to the image server', error: 'Connection refused' },
          { status: 503 } // Service Unavailable
        );
      } else if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { message: 'Image upload timed out', error: 'Request timeout' },
          { status: 504 } // Gateway Timeout
        );
      } else if (fetchError.code === 'ENOTFOUND') {
        return NextResponse.json(
          { message: 'Image server not found', error: 'DNS resolution failed' },
          { status: 502 } // Bad Gateway
        );
      }
      
      return NextResponse.json(
        { message: 'Failed to upload images to server', error: fetchError.message },
        { status: 502 } // Bad Gateway
      );
    }
    
    // Check response content type to handle different response formats
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      console.error(`[UPLOAD] Error response: ${response.status} ${response.statusText}`);
      
      // Special handling for common error codes
      if (response.status === 413) {
        return NextResponse.json(
          { message: 'Files are too large for the server to handle', error: 'Request Entity Too Large' },
          { status: 413 }
        );
      }
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { message: 'Authentication failed. Please log in again.', error: 'Authentication Error' },
          { status: response.status }
        );
      }
      
      // Handle error response based on content type
      if (contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('[UPLOAD] JSON error data:', errorData);
          return NextResponse.json(
            { message: errorData.message || 'Failed to upload images', error: errorData.error || 'Unknown error' },
            { status: response.status }
          );
        } catch (e) {
          const text = await response.text();
          console.error('[UPLOAD] Failed to parse JSON error response:', text.substring(0, 500));
          return NextResponse.json(
            { message: 'Failed to upload images', error: `Server error (${response.status})` },
            { status: 502 } // Bad Gateway for server errors
          );
        }
      } else {
        // If it's HTML or another format, convert to a meaningful JSON error
        const text = await response.text();
        console.error('[UPLOAD] Non-JSON error response:', text.substring(0, 500));
        
        let errorMessage = 'Server returned a non-JSON error response';
        // Try to extract a better error message if it's an HTML response
        if (contentType.includes('text/html')) {
          // Look for common error indicators in HTML
          if (text.includes('413') || text.includes('Request Entity Too Large')) {
            errorMessage = 'Files are too large for the server to handle. Try uploading fewer or smaller files.';
          } else if (text.includes('504') || text.includes('Gateway Timeout')) {
            errorMessage = 'Server timed out while processing the upload. Try uploading fewer or smaller files.';
          } else if (text.includes('502') || text.includes('Bad Gateway')) {
            errorMessage = 'Could not connect to the image processing server. Please try again later.';
          } else if (text.includes('401') || text.includes('Unauthorized')) {
            errorMessage = 'Authentication failed. Please log in again.';
          }
        }
        
        return NextResponse.json(
          { message: 'Failed to upload images', error: errorMessage },
          { status: 502 } // Use Bad Gateway for server errors
        );
      }
    }

    // Handle success response
    if (contentType.includes('application/json')) {
      try {
        const data = await response.json();
        console.log('[UPLOAD] Upload success data:', data);
        
        // Ensure we have the expected data structure
        if (!data.imageUrls && data.urls) {
          // Some APIs might return urls instead of imageUrls
          data.imageUrls = data.urls;
        }
        
        // If we still don't have imageUrls, provide a default
        if (!data.imageUrls) {
          console.warn('[UPLOAD] Success response missing imageUrls property');
          data.imageUrls = [];
        }
        
        return NextResponse.json(data);
      } catch (e) {
        console.error('[UPLOAD] Failed to parse JSON success response');
        const text = await response.text();
        console.error('[UPLOAD] Response text:', text.substring(0, 200));
        
        // Return a default success response
        return NextResponse.json({
          message: 'Images uploaded but received invalid JSON response',
          success: true,
          imageUrls: [] // Return empty array as fallback
        });
      }
    } else {
      // Handle unexpected success response format
      const text = await response.text();
      console.log('[UPLOAD] Non-JSON success response:', text.substring(0, 500));
      
      // Return a default success response
      return NextResponse.json({
        message: 'Images uploaded but received unexpected response format',
        success: true,
        imageUrls: [] // Return empty array as fallback
      });
    }
    
  } catch (error) {
    console.error('[UPLOAD] Uncaught error:', error);
    return NextResponse.json(
      { message: 'Failed to upload images', error: error.message },
      { status: 500 }
    );
  }
} 