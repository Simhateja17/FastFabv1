import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import ms from 'ms'; // Import ms directly

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

// --- JWT Configuration --- 
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// --- Helper Functions --- 

/**
 * Format phone number to include +91 prefix for database storage
 */
const formatPhoneNumberForDB = (phoneNumber) => {
  let digits = phoneNumber.replace(/\D/g, "");
  if (digits.length === 10) {
    return "+91" + digits;
  } else if (digits.startsWith("91") && digits.length === 12) {
    return "+" + digits;
  } else if (digits.startsWith("+")) {
    return digits;
  }
  return "+" + digits; // Assume it needs a '+'
};

/**
 * Verify OTP from database
 */
const verifyOTP = async (phoneNumber, otpCode) => {
  if (!prisma) throw new Error("Database connection failed");
  
  console.log('[Seller Verify] Verifying OTP in database for phone:', phoneNumber, 'code:', otpCode);
  
  const otp = await prisma.whatsAppOTP.findFirst({
    where: {
      phoneNumber,
      expiresAt: { gt: new Date() }, // Check if not expired
      verified: false, // Ensure it hasn't been used
    },
    orderBy: { createdAt: 'desc' }, // Get the latest one
  });

  if (!otp) {
    console.log('[Seller Verify] No valid (unexpired, unverified) OTP found.');
    return { success: false, message: 'OTP is invalid or expired' };
  }

  if (otp.otpCode === otpCode) {
    // Mark as verified
    await prisma.whatsAppOTP.update({
      where: { id: otp.id },
      data: { verified: true },
    });
    console.log('[Seller Verify] OTP verified successfully in database:', otp.id);
    return { success: true };
  } else {
    console.log('[Seller Verify] OTP code mismatch.');
    return { success: false, message: 'Invalid OTP code' };
  }
};

/**
 * Check if seller exists by phone number
 */
const checkSellerExists = async (phoneNumber) => {
  if (!prisma) throw new Error("Database connection failed");

  const existingSeller = await prisma.seller.findUnique({
    where: { phone: phoneNumber }
  });
  
  return { exists: !!existingSeller, sellerId: existingSeller?.id };
};

/**
 * Generate JWT Tokens for Seller
 */
const generateSellerTokens = (sellerId) => {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    console.error('JWT secrets are not configured');
    throw new Error('Authentication configuration error.');
  }
  const accessToken = jwt.sign({ sellerId, type: 'seller' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ sellerId, type: 'seller' }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
};

/**
 * Store Seller Refresh Token
 */
const storeSellerRefreshToken = async (sellerId, refreshToken) => {
   if (!prisma) throw new Error("Database connection failed");
   const expiresAt = new Date(Date.now() + ms(REFRESH_TOKEN_EXPIRY));
   try {
        // Delete existing tokens first
        await prisma.refreshToken.deleteMany({
            where: { sellerId: sellerId },
        });
        console.log(`[Seller Verify] Deleted existing refresh tokens for seller: ${sellerId}`);

        // Create new token
        await prisma.refreshToken.create({
            data: { 
                sellerId: sellerId, 
                token: refreshToken, 
                expiresAt: expiresAt 
            },
        });
        console.log(`[Seller Verify] Stored new refresh token for seller: ${sellerId}`);
   } catch (dbError) {
        console.error("[Seller Verify] Database error storing refresh token:", dbError);
        // Optionally re-throw or handle depending on desired behavior if token storage fails
        throw new Error('Failed to store session information.'); 
   }
};

// --- API Route Handler --- 

export async function POST(request) {
  if (!prisma) {
    return NextResponse.json({ message: 'Database connection failed' }, { status: 503 });
  }

  try {
    const body = await request.json();
    let { phone: phoneNumber, code: otpCode } = body;

    console.log('[Seller Verify] Request received:', { phoneNumber, otpCode });

    if (!phoneNumber || !otpCode) {
        return NextResponse.json({ success: false, message: 'Phone number and OTP code are required' }, { status: 400 });
    }

    // Format phone for DB consistency (+91 prefix)
    const dbFormattedPhone = formatPhoneNumberForDB(phoneNumber);
    
    // Format phone for Seller table lookup (assuming 10 digits)
    let lookupPhone = phoneNumber.replace(/\D/g, ""); // Remove non-digits
    if (lookupPhone.startsWith("91") && lookupPhone.length === 12) {
        lookupPhone = lookupPhone.substring(2); // Get last 10 digits
    }
    // Ensure it's exactly 10 digits for lookup
    if (lookupPhone.length !== 10) {
        console.warn(`[Seller Verify] Provided phone number '${phoneNumber}' did not result in a 10-digit number for lookup.`);
        // Handle this case - maybe return an error or use the original if that's how inconsistent data is stored
        // For now, we'll proceed, but this might indicate a data inconsistency issue.
    }

    // Verify OTP using the +91 format
    const verificationResult = await verifyOTP(dbFormattedPhone, otpCode);
    
    if (!verificationResult.success) {
      return NextResponse.json({ success: false, message: verificationResult.message, verified: false }, { status: 400 });
    }

    // Check if seller exists using the 10-digit format
    console.log(`[Seller Verify] Checking existence using lookup phone: ${lookupPhone}`);
    const sellerCheck = await checkSellerExists(lookupPhone);

    if (sellerCheck.exists) {
      // --- Existing Seller: Log them in --- 
      console.log('[Seller Verify] Seller exists, proceeding with login for sellerId:', sellerCheck.sellerId);
      const sellerId = sellerCheck.sellerId;

      // Generate Tokens
      const { accessToken, refreshToken } = generateSellerTokens(sellerId);

      // Store Refresh Token
      await storeSellerRefreshToken(sellerId, refreshToken); 

      // Create Response and Set Cookies
      const response = NextResponse.json({
        success: true,
        message: 'Seller login successful via OTP',
        verified: true,
        isNewSeller: false,
        sellerId: sellerId,
      }, { status: 200 });

      const secureCookie = process.env.NODE_ENV !== 'development';
      const accessTokenMaxAge = ms(ACCESS_TOKEN_EXPIRY) / 1000;
      const refreshTokenMaxAge = ms(REFRESH_TOKEN_EXPIRY) / 1000;

      console.log('[Seller Verify] Setting cookies - secure:', secureCookie, 'accessMaxAge:', accessTokenMaxAge, 'refreshMaxAge:', refreshTokenMaxAge);

      response.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax',
        path: '/',
        maxAge: accessTokenMaxAge,
      });

      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax',
        path: '/',
        maxAge: refreshTokenMaxAge,
      });
      
      console.log('[Seller Verify] Cookies set for existing seller login.');
      return response;

    } else {
      // --- New Seller: Indicate verification success --- 
      console.log('[Seller Verify] Seller does not exist. OTP verified, proceed with registration.');
      // Only verification was done. Registration happens in a separate step.
      // No cookies set here.
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully. New seller detected.',
        verified: true,
        isNewSeller: true,
        sellerId: null, 
      }, { status: 200 });
    }

  } catch (error) {
    console.error('[Seller Verify] Error:', error);
    // Handle specific errors like DB connection issues if needed
    let message = 'Failed to verify OTP.';
    if (error.message === 'Database connection failed') {
        message = 'Service temporarily unavailable.';
    }
    return NextResponse.json(
      { success: false, message: message, error: error.message }, 
      { status: 500 }
    );
  }
} 