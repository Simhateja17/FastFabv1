import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { customAlphabet } from 'nanoid';

// Create a Prisma client instance
const prisma = new PrismaClient();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate JWT tokens for Seller
const generateSellerTokens = (sellerId) => {
  // Create access token
  const accessToken = jwt.sign({ sellerId, type: 'seller' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  // Create refresh token
  const refreshToken = jwt.sign({ sellerId, type: 'seller' }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

// Store Seller refresh token in database
// Assumes a SellerRefreshToken model exists similar to RefreshToken but linked to Seller
// If using a single RefreshToken table, ensure schema supports linking to Seller
const storeSellerRefreshToken = async (sellerId, refreshToken) => {
  try {
    // Use the correct model for seller refresh tokens
    // Explicitly use prisma.refreshToken based on schema analysis
    const refreshTokenModel = prisma.refreshToken;

    // Remove any existing refresh tokens for this seller
    await refreshTokenModel.deleteMany({
      where: { sellerId },
    });

    // Store the new refresh token
    // Calculate expiry based on JWT_REFRESH_EXPIRES_IN (e.g., 7d)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Manually generate an ID like the user flow
    const cuid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24);
    const tokenId = cuid();

    await refreshTokenModel.create({
      data: {
        id: tokenId, // Manually set the ID
        token: refreshToken,
        sellerId,
        expiresAt, // Set expiry based on config
      },
    });
  } catch (error) {
    console.error('Error storing seller refresh token:', error);
    // Decide if this error should prevent login or just be logged
    // For now, we re-throw to indicate a problem
    // throw new Error('Failed to store refresh token'); // <-- Commented out generic error
    throw error; // <-- Added: Propagate original error for better debugging
  }
};

export async function POST(request) {
  try {
    console.log('Seller OTP sign-in request received');

    // Get phone from request
    const { phone } = await request.json();

    if (!phone) {
      console.error('No phone number provided for seller OTP sign-in');
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // --- Removed Forwarding Logic ---
    // const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    // const endpoint = `${apiUrl}/api/auth/seller-otp-login`;
    // console.log(`Forwarding OTP sign-in request to: ${endpoint}`);
    // const response = await fetch(endpoint, { ... });
    // ... handling response ...

    // --- Added Local Seller Login Logic ---

    // 1. Find Seller by phone
    const seller = await prisma.seller.findUnique({
      where: { phone: phone }, // Ensure phone has correct format if needed
      // Select necessary fields, excluding password
      select: {
        id: true,
        phone: true,
        shopName: true,
        ownerName: true,
        // isComplete: true, // Removed: Field does not exist on Seller model
        // Add other relevant non-sensitive fields needed for the response
      }
    });

    // 2. Check if seller exists
    if (!seller) {
      console.log(`Seller not found for phone: ${phone}`);
      return NextResponse.json(
        { success: false, message: 'Seller account not found.' },
        { status: 404 }
      );
    }

    // Removed check for isComplete as the field does not exist
    // if (!seller.isComplete) {
    //     console.log(`Seller profile incomplete for phone: ${phone}`);
    //     return NextResponse.json(
    //       { success: false, message: 'Seller profile setup is incomplete.', code: 'PROFILE_INCOMPLETE' },
    //       { status: 403 } // Use 403 Forbidden or another appropriate status
    //     );
    // }

    console.log(`Seller found: ${seller.id}. Proceeding with token generation.`);

    // 3. Generate Tokens
    const { accessToken, refreshToken } = generateSellerTokens(seller.id);

    // 4. Store Refresh Token
    await storeSellerRefreshToken(seller.id, refreshToken);

    // 5. Set Cookies
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    await cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    await cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // Use JWT_REFRESH_EXPIRES_IN (e.g., 7 days)
      path: '/',
    });

    console.log(`Tokens set successfully for seller ${seller.id}`);

    // 6. Return Success Response with Seller Data AND Tokens
    return NextResponse.json({
      success: true,
      message: 'Seller login successful',
      seller: seller, // Return the selected seller data
      accessToken: accessToken, // Include accessToken in the body
      refreshToken: refreshToken // Include refreshToken in the body
    });

  } catch (error) {
    console.error('Seller OTP sign-in processing error:', error);
    // Distinguish between known errors (like DB store fail) and unexpected errors
    const message = error.message === 'Failed to store refresh token'
      ? 'Login failed due to server issue storing session.'
      : 'Internal server error during sign-in.';

    return NextResponse.json(
      { success: false, message: message },
      { status: 500 }
    );
  }
} 