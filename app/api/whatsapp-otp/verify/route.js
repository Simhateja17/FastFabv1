import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a more reliable Prisma client with reconnection
let prisma;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 5; // Increased to give more chances to connect

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

// Remove all in-memory OTP store references

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
 * Verify OTP from database only
 */
const verifyOTP = async (phoneNumber, otpCode) => {
  // Make sure Prisma is initialized
  const db = await initPrisma();
  // If we get here, we have a database connection
  
  console.log('Verifying OTP in database for phone:', phoneNumber, 'code:', otpCode);
  
  // Check if otpCode exists in the database for this phone number
  const allOtps = await db.whatsAppOTP.findMany({
    where: {
      phoneNumber,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  console.log('Found OTPs for this number:', allOtps.length, 'OTPs');
  if (allOtps.length > 0) {
    // Log details about found OTPs to help debug
    allOtps.forEach((otp, index) => {
      console.log(`OTP ${index+1}:`, {
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
      expiresAt: { gt: new Date() },
      verified: false,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Add detailed debug logging
  debugVerify(phoneNumber, otpCode, otp);
  
  if (!otp) {
    console.log('No valid OTP found for this phone number');
    return { success: false, message: 'No valid OTP found' };
  }
  
  console.log('Found OTP in database:', otp.id);
  console.log('Comparing input OTP:', otpCode, 'with stored OTP:', otp.otpCode);
  
  if (otp.otpCode === otpCode) {
    // Mark as verified
    await db.whatsAppOTP.update({
      where: { id: otp.id },
      data: { verified: true },
    });
    console.log('OTP verified successfully in database:', otp.id);
    return { success: true };
  }
  
  console.log('OTP code mismatch. Verification failed.');
  // Not found in database - return failure
  return { success: false, message: 'Invalid OTP code' };
};

/**
 * Check if user exists by phone number
 */
const checkUserExists = async (phoneNumber) => {
  // Make sure Prisma is initialized
  const db = await initPrisma();
  // If we get here, we have a database connection
  
  const existingUser = await db.user.findUnique({
    where: { phone: phoneNumber }
  });
  
  if (existingUser) {
    return { exists: true, userId: existingUser.id };
  }
  
  return { exists: false };
};

// Log additional information about verification
const debugVerify = (phoneNumber, otpCode, otp) => {
  console.log('===== WhatsApp OTP Verification Debug Info =====');
  console.log('Phone number:', phoneNumber);
  console.log('OTP code entered:', otpCode);
  console.log('OTP found in database:', otp ? 'Yes' : 'No');
  if (otp) {
    console.log('OTP details:', {
      id: otp.id,
      code: otp.otpCode,
      expired: new Date() > otp.expiresAt,
      expiresAt: otp.expiresAt,
      verified: otp.verified,
      createdAt: otp.createdAt
    });
  }
  console.log('===== End Debug Info =====');
};

export async function POST(request) {
  try {
    const body = await request.json();
    let { phoneNumber, otpCode } = body;
    
    console.log('OTP verification request received:', { phoneNumber, otpLength: otpCode?.length });
    
    // Format the phone number (add +91 prefix if it's a 10-digit number)
    phoneNumber = formatPhoneNumber(phoneNumber);

    // Validate phone number and OTP
    if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.'
      }, { status: 400 });
    }

    if (!otpCode || otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid OTP. Please provide a valid 6-digit OTP.'
      }, { status: 400 });
    }

    // Attempt to verify OTP
    const verificationResult = await verifyOTP(phoneNumber, otpCode);
    console.log('Verification result:', verificationResult);
    
    if (!verificationResult.success) {
      return NextResponse.json({
        success: false,
        message: verificationResult.message,
        verified: false
      }, { status: 400 });
    }

    // Check if a user already exists with this phone number
    const userCheck = await checkUserExists(phoneNumber);
    const db = await initPrisma();
    
    let userId = null;
    
    // If user doesn't exist, we'll create a new one with just the phone number
    // The actual name will be set during the registration process
    if (!userCheck.exists) {
      console.log('User does not exist, marking as new user');
      // We don't create the user here - this will be done in the registration endpoint
    } else {
      console.log('User exists, retrieving user data');
      userId = userCheck.userId;
    }
    
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      isNewUser: !userCheck.exists,
      userId: userId,
      verified: true,
      status: 'success'
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
    // Provide more specific error messages based on error types
    let message = 'Failed to verify OTP. Please try again.';
    let statusCode = 500;
    
    // Handle Prisma database errors
    if (error.code && error.code.startsWith('P')) {
      if (error.code === 'P2002') {
        message = 'A user with this phone number already exists.';
        statusCode = 400;
      } else if (error.code.startsWith('P1')) {
        message = 'Database connection error. Please try again later.';
        statusCode = 503;
      }
    }
    
    return NextResponse.json({
      success: false,
      message,
      error: error.message
    }, { status: statusCode });
  }
} 