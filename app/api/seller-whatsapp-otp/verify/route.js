import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a more reliable Prisma client with reconnection
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
        console.log('Previous connection was terminated, creating a new one...');
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
    console.log(`Initializing PrismaClient (attempt ${connectionAttempts}/${MAX_ATTEMPTS})...`);
    
    // Create a new PrismaClient instance
    const newPrisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'pretty'
    });
    
    // Test the connection
    await newPrisma.$connect();
    console.log('PrismaClient connected successfully to database');
    
    prisma = newPrisma;
    return prisma;
  } catch (e) {
    console.error('Failed to initialize PrismaClient:', e);
    
    // Special handling for known database termination errors
    if (e.message && (e.message.includes('E57P01') || e.message.includes('terminating connection'))) {
      console.log('Connection was terminated by administrator command. Retrying...');
      if (connectionAttempts < MAX_ATTEMPTS) {
        console.log(`Retrying connection in 2 seconds... (${connectionAttempts}/${MAX_ATTEMPTS})`);
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return initPrisma(); // Recursive retry
      }
    } else if (connectionAttempts < MAX_ATTEMPTS) {
      console.log(`Retrying connection in 1 second... (${connectionAttempts}/${MAX_ATTEMPTS})`);
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initPrisma(); // Recursive retry
    }
    
    // No fallback to in-memory storage, just throw the error
    throw new Error('Failed to connect to database after maximum retry attempts');
  }
};

// Initialize Prisma on module load
initPrisma().catch(e => console.error('Initial Prisma connection failed:', e));

/**
 * Format 10-digit phone number to E.164 format with +91 prefix
 * @param {string} phoneNumber - 10-digit phone number
 * @returns {string} Phone number in E.164 format
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any spaces, dashes, or other characters
  const digits = phoneNumber.replace(/\D/g, "");
  
  // If it's already in E.164 format, return as is
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }
  
  // If it's a 10-digit number, add +91 prefix (assuming India)
  if (digits.length === 10) {
    return "+91" + digits;
  }
  
  // Otherwise return the original input with + prefix if missing
  return digits.startsWith("91") ? "+" + digits : "+" + digits;
};

/**
 * Verify OTP from database for seller
 */
const verifyOTP = async (phoneNumber, otpCode) => {
  // Make sure Prisma is initialized
  const db = await initPrisma();
  
  console.log('Verifying seller OTP in database for phone:', phoneNumber, 'code:', otpCode);
  
  // Find the latest non-expired OTP
  const otp = await db.whatsAppOTP.findFirst({
    where: {
      phoneNumber,
      expiresAt: { gt: new Date() },
      verified: false,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (!otp) {
    console.log('No valid OTP found for this seller phone number');
    return { success: false, message: 'No valid OTP found or OTP has expired' };
  }
  
  console.log('Found seller OTP in database:', otp.id);
  console.log('Comparing input OTP:', otpCode, 'with stored OTP:', otp.otpCode);
  
  if (otp.otpCode === otpCode) {
    // Mark as verified
    await db.whatsAppOTP.update({
      where: { id: otp.id },
      data: { 
        verified: true,
        updatedAt: new Date()
      },
    });
    console.log('Seller OTP verified successfully in database:', otp.id);
    return { success: true };
  }
  
  console.log('OTP code mismatch. Seller verification failed.');
  return { success: false, message: 'Invalid OTP code' };
};

/**
 * Check if seller exists by phone number
 */
const checkSellerExists = async (phoneNumber) => {
  // Format the number for database lookup (remove +91 prefix if present)
  let dbPhone = phoneNumber;
  if (phoneNumber.startsWith('+91')) {
    dbPhone = phoneNumber.substring(3);
  } else if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
    dbPhone = phoneNumber.substring(2);
  }
  
  // Make sure Prisma is initialized
  const db = await initPrisma();
  
  const existingSeller = await db.seller.findUnique({
    where: { phone: dbPhone }
  });
  
  if (existingSeller) {
    console.log('Found existing seller with phone number:', phoneNumber);
    
    // Update seller's phone verification status if needed
    if (!existingSeller.isPhoneVerified) {
      await db.seller.update({
        where: { id: existingSeller.id },
        data: { isPhoneVerified: true }
      });
      console.log('Updated seller phone verification status');
    }
    
    return { 
      exists: true, 
      sellerId: existingSeller.id,
      isComplete: !!(existingSeller.shopName && existingSeller.ownerName)
    };
  }
  
  console.log('No existing seller found with phone number:', phoneNumber);
  return { exists: false };
};

export async function POST(request) {
  try {
    const requestData = await request.json();

    console.log('Seller OTP verify request:', {
      phoneNumber: requestData.phoneNumber ? 'provided' : 'missing',
      otpCode: requestData.otpCode ? 'provided' : 'missing',
    });

    if (!requestData.phoneNumber || !requestData.otpCode) {
      return NextResponse.json({
        success: false,
        message: 'Phone number and OTP code are required',
        verified: false
      }, { status: 400 });
    }

    // Directly use local verification
    console.log('Using local OTP verification implementation.');

    // Format phone number
    const phoneNumber = formatPhoneNumber(requestData.phoneNumber);
    const otpCode = requestData.otpCode;

    // Attempt to verify OTP locally
    const verificationResult = await verifyOTP(phoneNumber, otpCode);
    console.log('Local verification result:', verificationResult);

    if (!verificationResult.success) {
      return NextResponse.json({
        success: false,
        message: verificationResult.message || 'Invalid OTP or OTP expired', // Provide default message
        verified: false
      }, { status: 400 });
    }

    // OTP is valid, now check if a seller already exists with this phone number
    const sellerCheck = await checkSellerExists(phoneNumber);
    console.log('Seller existence check:', sellerCheck);

    // Determine if the seller profile is complete (for existing sellers)
    const isProfileComplete = sellerCheck.exists ? sellerCheck.isComplete : false;

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      verified: true, // Explicitly set verified to true on success
      isNewSeller: !sellerCheck.exists,
      isExistingSeller: sellerCheck.exists,
      sellerId: sellerCheck.sellerId || null,
      isProfileComplete: isProfileComplete, // Add completion status
      // Include any other necessary fields from the original successful response if needed
    }, { status: 200 });

  } catch (error) {
    console.error('Error in seller OTP verification route:', error);

    // Handle potential Prisma initialization errors or other unexpected errors
     if (error.message.includes('Failed to connect to database')) {
      return NextResponse.json({
        success: false,
        message: 'Database connection error. Please try again later.',
        verified: false
      }, { status: 503 }); // Service Unavailable
    }
    
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid request format.',
          verified: false
        }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred during OTP verification.',
      verified: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined // Show specific error only in dev
    }, { status: 500 });
  }
}

// Ensure Prisma client disconnects gracefully on server shutdown
process.on('SIGTERM', async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('PrismaClient disconnected on SIGTERM');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('PrismaClient disconnected on SIGINT');
  }
  process.exit(0);
}); 