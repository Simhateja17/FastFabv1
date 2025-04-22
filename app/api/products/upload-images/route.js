import { NextResponse } from 'next/server';
import { auth } from "@/app/lib/auth"; // Import the auth helper
import { v4 as uuidv4 } from 'uuid'; // For generating unique names if needed
import path from 'path'; // To handle file extensions
import { createClient } from '@supabase/supabase-js'; // Import Supabase client

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'product_images'; // Use env var or default

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("FATAL ERROR: Supabase URL or Service Key environment variables are not set.");
    // Consider throwing an error or handling this more gracefully in production
}

// Initialize Supabase client with the service key for backend operations
// NOTE: Using Service Key grants full access, ensure proper RLS policies if using Anon key instead
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false } // Prevent server-side session persistence
});

// --- End Supabase Setup ---
// hi
// Set this to the largest size you want to accept (in bytes)
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_FILES_SIZE = 100 * 1024 * 1024; // 100MB total
const MAX_FILES = 10; // Maximum number of files per upload

// Define allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// --- REAL Upload function using Supabase ---
async function uploadToSupabaseStorage(file, sellerId) {
    console.log(`[Supabase Upload] Attempting upload for: ${file.name}`);
    try {
        // Generate a unique path/filename within the bucket
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const extension = path.extname(file.name);
        // Store images under a folder for the seller for organization
        const filePath = `public/${sellerId}/${path.basename(file.name, extension)}-${uniqueSuffix}${extension}`;

        // Convert File to ArrayBuffer for upload
        const fileBuffer = await file.arrayBuffer();

        console.log(`[Supabase Upload] Uploading to bucket: ${bucketName}, path: ${filePath}`);

        // Upload using Supabase client (admin client with service key)
        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                cacheControl: '3600', // Cache for 1 hour
                upsert: false // Don't overwrite existing files (use true if needed)
            });

        if (uploadError) {
            console.error(`[Supabase Upload] Error during Supabase upload for ${file.name}:`, uploadError);
            throw new Error(`Failed to upload ${file.name} to storage: ${uploadError.message}`);
        }

        if (!uploadData || !uploadData.path) {
             console.error(`[Supabase Upload] Upload successful but path missing in response for ${file.name}:`, uploadData);
             throw new Error(`Upload for ${file.name} succeeded but failed to get storage path.`);
        }

        console.log(`[Supabase Upload] Successfully uploaded ${file.name} to path: ${uploadData.path}`);

        // Get the public URL for the uploaded file
        const { data: urlData } = supabaseAdmin
            .storage
            .from(bucketName)
            .getPublicUrl(uploadData.path);

        if (!urlData || !urlData.publicUrl) {
            console.error(`[Supabase Upload] Could not get public URL for path: ${uploadData.path}`);
            // Maybe return the path itself as a fallback? Or throw an error.
            // Returning path might work if bucket is public and URL structure is predictable.
            // throw new Error(`Failed to get public URL for uploaded file: ${uploadData.path}`);
             console.warn(`[Supabase Upload] Falling back to constructing URL manually for ${uploadData.path}`);
             return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uploadData.path}`; // Manual construction (less ideal)
        }

        console.log(`[Supabase Upload] Public URL for ${file.name}: ${urlData.publicUrl}`);
        return urlData.publicUrl;

    } catch (error) {
        console.error(`[Supabase Upload] Unexpected error during upload process for ${file.name}:`, error);
        // Re-throw the error to be caught by the main handler
        throw error;
    }
}
// --- End REAL Upload function ---

export async function POST(request) {
    console.log('[UPLOAD] Image upload request received in Next.js route handler.');
    let sellerId = null; // Define sellerId here to be accessible in the final response
    
    // 1. Authenticate the request
    try {
        const authResult = await auth(request);
        if (!authResult.success || !authResult.sellerId) {
            console.error('[UPLOAD] Authentication failed:', authResult.message);
            return NextResponse.json({ message: authResult.message || "Authentication required" }, { status: 401 });
        }
        sellerId = authResult.sellerId; // Assign authenticated sellerId
        console.log(`[UPLOAD] Authenticated seller: ${sellerId}`);
    } catch (authError) {
        console.error('[UPLOAD] Error during authentication:', authError);
        return NextResponse.json({ message: "Authentication error" }, { status: 500 });
    }

    // Check if Supabase client is initialized (basic check)
     if (!supabaseAdmin) {
         console.error("[UPLOAD] Supabase admin client not initialized. Check environment variables.");
         return NextResponse.json({ message: "Storage service configuration error." }, { status: 500 });
     }

    // 2. Parse FormData
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('[UPLOAD] Error parsing form data:', formError);
        return NextResponse.json({ message: 'Invalid form data' }, { status: 400 });
    }
    
    const imageFiles = formData.getAll('images');
    if (!imageFiles || imageFiles.length === 0) {
        return NextResponse.json({ message: 'No image files provided' }, { status: 400 });
    }
    if (imageFiles.length > MAX_FILES) {
        return NextResponse.json({ message: `Maximum ${MAX_FILES} files allowed per upload.` }, { status: 400 });
    }

    // 3. Validate files and prepare for upload
    const uploadedUrls = [];
    let totalSize = 0;
    const filesToUpload = [];

    for (const file of imageFiles) {
        // Basic check if it's actually a File object
        if (!file || typeof file.size !== 'number' || typeof file.type !== 'string' || typeof file.name !== 'string') {
             console.warn('[UPLOAD] Invalid file object encountered in FormData.');
             // Skip this entry or return an error
             continue; 
        }

      totalSize += file.size;
      
        // Validate size and type
        if (file.size === 0) {
           return NextResponse.json({ message: `File '${file.name}' is empty.` }, { status: 400 });
        }
      if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ message: `File '${file.name}' exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.` }, { status: 413 }); // Payload Too Large
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return NextResponse.json({ message: `File type '${file.type}' for '${file.name}' is not allowed.` }, { status: 415 }); // Unsupported Media Type
        }
        filesToUpload.push(file);
    }

    if (totalSize > MAX_TOTAL_FILES_SIZE) {
        return NextResponse.json({ message: `Total size exceeds ${MAX_TOTAL_FILES_SIZE / (1024 * 1024)}MB limit.` }, { status: 413 });
    }
    
    if (filesToUpload.length === 0) {
        return NextResponse.json({ message: 'No valid image files found to upload.' }, { status: 400 });
    }

    console.log(`[UPLOAD] Validated ${filesToUpload.length} files. Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

    // 4. Process Uploads (REAL Implementation using Supabase)
    try {
        for (const file of filesToUpload) {
            // Use the real Supabase upload function, passing sellerId for path organization
            const publicUrl = await uploadToSupabaseStorage(file, sellerId);
            uploadedUrls.push(publicUrl);
        }

        console.log('[UPLOAD] All files uploaded successfully to Supabase.');
        // 5. Return Success Response
        return NextResponse.json({
          success: true,
            message: `${uploadedUrls.length} images uploaded successfully.`, 
            imageUrls: uploadedUrls 
        }, { status: 200 });

    } catch (uploadError) {
        console.error('[UPLOAD] Error during Supabase upload process:', uploadError);
        // Return the specific error message from the upload function if available
        return NextResponse.json({ message: 'Failed to upload one or more images.', error: uploadError.message || 'Unknown upload error' }, { status: 500 });
  }
} 