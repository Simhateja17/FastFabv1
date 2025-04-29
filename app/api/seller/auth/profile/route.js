import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// --- Prisma Client Initialization (Consider moving to a lib file) ---
let prisma;
try {
  prisma = new PrismaClient({
    log: ['warn', 'error']
  });
} catch (e) {
  console.error("Failed to initialize Prisma Client:", e);
  prisma = null;
}

// --- JWT Secret --- 
const JWT_SECRET = process.env.JWT_SECRET;

// --- Helper Functions --- 

/**
 * Verify JWT access token from cookies
 */
const verifyTokenFromCookies = (request) => {
  if (!JWT_SECRET) {
    console.error('[Seller Profile] JWT_SECRET not set');
    return null;
  }
  try {
    const cookieStore = cookies(); // Use next/headers cookies
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
      console.log('[Seller Profile] Access token cookie not found');
      return null;
    }

    console.log('[Seller Profile] Verifying token from cookie...');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check for sellerId in various possible fields
    const sellerId = decoded.sellerId || decoded.sub;

    if (!sellerId) {
        console.error('[Seller Profile] Token is missing sellerId claim', decoded);
        return null;
    }
    
    // Check if token is identified as seller type, but don't require it
    // This makes the function more flexible with existing tokens
    if (decoded.type && decoded.type !== 'seller') {
        console.warn('[Seller Profile] Token type is not \'seller\':', decoded.type);
    }
    
    console.log(`[Seller Profile] Token verified successfully for sellerId: ${sellerId}`);
    return { sellerId }; // Return object with sellerId

  } catch (error) {
    console.error('[Seller Profile] Token verification failed:', error.message);
    return null;
  }
};

// --- API Route Handler --- 

export async function GET(request) {
  if (!prisma) {
    return NextResponse.json({ message: 'Database connection failed' }, { status: 503 });
  }
  
  console.log('[Seller Profile] Received GET request');

  try {
    // 1. Verify Authentication from Cookies
    const authResult = verifyTokenFromCookies(request);

    if (!authResult || !authResult.sellerId) {
      console.log('[Seller Profile] Authentication failed or missing sellerId.');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const sellerId = authResult.sellerId;
    console.log(`[Seller Profile] Authenticated sellerId: ${sellerId}`);

    // 2. Fetch seller data from database
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        phone: true,
        shopName: true,
        ownerName: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        openTime: true,
        closeTime: true,
        categories: true,
        createdAt: true,
        updatedAt: true,
        latitude: true,
        longitude: true,
        isPhoneVerified: true,
        gstNumber: true,
        isVisible: true,
        manuallyHidden: true,
        // Removed bank details fields
        // DO NOT select password or other sensitive fields like cashfreeBeneficiaryId unless needed
      }
    });

    if (!seller) {
      console.log(`[Seller Profile] Seller profile not found for ID: ${sellerId}`);
      // Even if token is valid, if seller doesn't exist in DB, it's an issue
      return NextResponse.json({ success: false, message: 'Seller profile not found' }, { status: 404 });
    }

    console.log(`[Seller Profile] Found seller profile for ID: ${sellerId}`);

    // 3. Return data
    return NextResponse.json({ success: true, seller: seller });

  } catch (error) {
    console.error("[Seller Profile] Error fetching profile:", error);
    let message = 'Failed to fetch profile.';
    if (error.message === 'Database connection failed') {
        message = 'Service temporarily unavailable.';
    }
    return NextResponse.json(
      { success: false, message: message, error: error.message },
      { status: 500 }
    );
  }
}

// Optional: Add PUT/PATCH handler if profile update is needed via this route
export async function PUT(request) {
   if (!prisma) {
    return NextResponse.json({ message: 'Database connection failed' }, { status: 503 });
  }
  
  console.log('[Seller Profile] Received PUT request');

  try {
    // 1. Verify Authentication
    const authResult = verifyTokenFromCookies(request);
    if (!authResult || !authResult.sellerId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const sellerId = authResult.sellerId;

    // 2. Get update data from request body
    const updateData = await request.json();
    console.log(`[Seller Profile] Update data received for seller ${sellerId}:`, updateData);

    // 3. Prepare data for update (only allow specific fields)
    const allowedUpdates = {
        shopName: updateData.shopName,
        ownerName: updateData.ownerName,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        pincode: updateData.pincode,
        openTime: updateData.openTime,
        closeTime: updateData.closeTime,
        categories: updateData.categories,
        gstNumber: updateData.gstNumber,
        // Removed bank details fields
        // Add other fields that are safe to update here
    };

    // Remove undefined fields so Prisma doesn't try to set them to null
    Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

    if (Object.keys(allowedUpdates).length === 0) {
        return NextResponse.json({ success: false, message: 'No valid fields provided for update.' }, { status: 400 });
    }

    // 4. Update seller in database
    const updatedSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: allowedUpdates,
      select: { // Return the same fields as GET
        id: true,
        phone: true,
        shopName: true,
        ownerName: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        openTime: true,
        closeTime: true,
        categories: true,
        createdAt: true,
        updatedAt: true,
        latitude: true,
        longitude: true,
        isPhoneVerified: true,
        gstNumber: true,
        isVisible: true,
        manuallyHidden: true,
        // Removed bank details fields
      }
    });

    console.log(`[Seller Profile] Successfully updated profile for seller ${sellerId}`);

    // 5. Return updated data
    return NextResponse.json({ success: true, message: 'Profile updated successfully', seller: updatedSeller });

  } catch (error) {
    console.error("[Seller Profile] Error updating profile:", error);
     let message = 'Failed to update profile.';
     if (error.message === 'Database connection failed') {
         message = 'Service temporarily unavailable.';
     }
    // Handle potential Prisma errors (e.g., P2025 Record not found)
    if (error.code === 'P2025') {
        message = 'Seller not found for update.';
        return NextResponse.json({ success: false, message: message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, message: message, error: error.message },
      { status: 500 }
    );
  }
} 