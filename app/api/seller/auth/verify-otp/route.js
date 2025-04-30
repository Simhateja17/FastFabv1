import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import ms from 'ms'; // Import ms directly

// --- Prisma Client Initialization (Consider moving to a lib file) ---
let prisma;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 5;

const initPrisma = async () => {
  // Reset the connection if it was previously terminated
  if (prisma) {
    try {
      // Test if the connection is still alive
      await prisma.$queryRaw`SELECT 1`;
      return prisma; // Connection is good
    } catch (e) {
      // Check if it's a termination error (E57P01)
      if (e.message && (e.message.includes('E57P01') || e.message.includes('terminating connection'))) {
        console.log('[Seller Verify] Previous connection was terminated, creating a new one...');
        await prisma.$disconnect().catch(() => {}); // Ignore errors from disconnect
        prisma = null; // Reset so we create a new client
        connectionAttempts = 0; // Reset attempts counter
      } else {
        throw e; // Re-throw unknown errors
      }
    }
  }
  
  try {
    connectionAttempts++;
    console.log(`[Seller Verify] Initializing PrismaClient (attempt ${connectionAttempts}/${MAX_ATTEMPTS})...`);
    
    // Create a new PrismaClient instance
    const newPrisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'pretty'
    });
    
    // Test the connection
    await newPrisma.$connect();
    console.log('[Seller Verify] PrismaClient connected successfully to database');
    
    prisma = newPrisma;
    return prisma;
  } catch (e) {
    console.error('[Seller Verify] Failed to initialize PrismaClient:', e);
    
    // Special handling for known database termination errors
    if (e.message && (e.message.includes('E57P01') || e.message.includes('terminating connection'))) {
      console.log('[Seller Verify] Connection was terminated by administrator command. Retrying...');
      if (connectionAttempts < MAX_ATTEMPTS) {
        console.log(`[Seller Verify] Retrying connection in 2 seconds... (${connectionAttempts}/${MAX_ATTEMPTS})`);
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return initPrisma(); // Recursive retry
      }
    } else if (connectionAttempts < MAX_ATTEMPTS) {
      console.log(`[Seller Verify] Retrying connection in 1 second... (${connectionAttempts}/${MAX_ATTEMPTS})`);
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initPrisma(); // Recursive retry
    }
    
    // No fallback to in-memory storage, just throw the error
    throw new Error('Failed to connect to database after maximum retry attempts');
  }
};

// Initialize Prisma on module load
initPrisma().catch(e => console.error('[Seller Verify] Initial Prisma connection failed:', e));

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
  // Remove any spaces, dashes, or other characters
  const digits = phoneNumber.replace(/\D/g, "");
  
  // If it's already in E.164 format, return as is
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }
  
  // If it's a 10-digit number, add +91 prefix (for India)
  if (digits.length === 10) {
    return "+91" + digits;
  }
  
  // If it starts with 91 and has 12 digits total, add + prefix
  if (digits.startsWith("91") && digits.length === 12) {
    return "+" + digits;
  }
  
  // Otherwise return with + prefix if missing
  return digits.startsWith("91") ? "+" + digits : "+" + digits;
};

/**
 * Verify OTP from database
 */
const verifyOTP = async (phoneNumber, otpCode) => {
  // Make sure Prisma is initialized
  const db = await initPrisma();
  // If we get here, we have a database connection
  
  console.log('[Seller Verify] Verifying OTP in database for phone:', phoneNumber, 'code:', otpCode);
  
  // Check if otpCode exists in the database for this phone number - for debugging
  const allOtps = await db.whatsAppOTP.findMany({
    where: {
      phoneNumber,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  console.log('[Seller Verify] Found OTPs for this number:', allOtps.length, 'OTPs');
  if (allOtps.length > 0) {
    // Log details about found OTPs to help debug
    allOtps.forEach((otp, index) => {
      console.log(`[Seller Verify] OTP ${index+1}:`, {
        id: otp.id, 
        code: otp.otpCode, 
        verified: otp.verified,
        expired: new Date() > otp.expiresAt,
        expiresAt: otp.expiresAt,
        createdAt: otp.createdAt
      });
    });
  }
  
  // Find the latest non-expired OTP
  const otp = await db.whatsAppOTP.findFirst({
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

  console.log('[Seller Verify] Found OTP in database:', otp.id);
  console.log('[Seller Verify] Comparing input OTP:', otpCode, 'with stored OTP:', otp.otpCode);
  
  if (otp.otpCode === otpCode) {
    // Mark as verified
    await db.whatsAppOTP.update({
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
  const db = await initPrisma();
  
  console.log('[Seller Verify] Checking if seller exists with phone:', phoneNumber);
  
  // Try finding with different phone formats if needed
  let lookupFormats = [
    phoneNumber, // Original format
  ];
  
  // If it has a + prefix, also try without it
  if (phoneNumber.startsWith('+')) {
    const digitsOnly = phoneNumber.substring(1);
    lookupFormats.push(digitsOnly);
    
    // For +91XXXXXXXXXX format, also try just the 10 digits
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      lookupFormats.push(digitsOnly.substring(2));
    }
  } 
  // For 10-digit number, try with country code
  else if (phoneNumber.length === 10 && /^\d+$/.test(phoneNumber)) {
    lookupFormats.push(`+91${phoneNumber}`);
    lookupFormats.push(`91${phoneNumber}`);
  }
  
  console.log('[Seller Verify] Looking up seller with phone formats:', lookupFormats);
  
  // Try each format
  for (const format of lookupFormats) {
    const seller = await db.seller.findFirst({
      where: { phone: format }
    });
    
    if (seller) {
      console.log('[Seller Verify] Found seller with phone format:', format);
      return { exists: true, sellerId: seller.id };
    }
  }
  
  console.log('[Seller Verify] No seller found with any phone format');
  return { exists: false, sellerId: null };
};

/**
 * Generate JWT Tokens for Seller
 */
const generateSellerTokens = (sellerId) => {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    console.error('[Seller Verify] JWT secrets are not configured');
    throw new Error('Authentication configuration error.');
  }
  
  // Create token payload with consistent field names
  const tokenPayload = { 
    sellerId,            // Primary field for seller ID - CRITICAL for backend validation
    sub: sellerId,       // JWT standard subject field
    type: 'seller',      // Explicit type for role-based checks
    role: 'seller'       // Alternative role field for compatibility
  };
  
  console.log('[Seller Verify] Creating tokens with payload:', JSON.stringify(tokenPayload));
  
  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  
  // Verify the token structure after signing (for debugging)
  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET);
    console.log('[Seller Verify] Verified token payload:', JSON.stringify(decoded));
    if (!decoded.sellerId) {
      console.error('[Seller Verify] ⚠️ WARNING: Generated token missing sellerId field!');
    }
  } catch (err) {
    console.error('[Seller Verify] Error verifying generated token:', err);
  }
  
  return { accessToken, refreshToken };
};

/**
 * Store Seller Refresh Token
 */
const storeSellerRefreshToken = async (sellerId, refreshToken) => {
   const db = await initPrisma();
   const expiresAt = new Date(Date.now() + ms(REFRESH_TOKEN_EXPIRY));
   try {
        // Delete existing tokens first
        await db.refreshToken.deleteMany({
            where: { sellerId: sellerId },
        });
        console.log(`[Seller Verify] Deleted existing refresh tokens for seller: ${sellerId}`);

        // Create new token
        await db.refreshToken.create({
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
  try {
    const body = await request.json();
    let { phone: phoneNumber, code: otpCode } = body;

    console.log('[Seller Verify] Request received:', { phoneNumber, otpCode });

    if (!phoneNumber || !otpCode) {
        return NextResponse.json({ 
          success: false, 
          message: 'Phone number and OTP code are required' 
        }, { status: 400 });
    }

    // Format phone for DB consistency (+91 prefix)
    const dbFormattedPhone = formatPhoneNumberForDB(phoneNumber);
    
    // Validate phone number and OTP
    if (!dbFormattedPhone || !dbFormattedPhone.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid phone number. Please provide a valid phone number.'
      }, { status: 400 });
    }

    if (!otpCode || otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid OTP. Please provide a valid 6-digit OTP.'
      }, { status: 400 });
    }

    // Verify OTP using the +91 format
    const verificationResult = await verifyOTP(dbFormattedPhone, otpCode);
    
    if (!verificationResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: verificationResult.message, 
        verified: false 
      }, { status: 400 });
    }

    // Check if seller exists using the formatted phone
    const sellerCheck = await checkSellerExists(dbFormattedPhone);

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