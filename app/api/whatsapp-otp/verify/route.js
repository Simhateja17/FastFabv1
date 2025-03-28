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
  if (digits.startsWith("91") && digits.length === 12) {
    return "+" + digits;
  }
  
  // If it's already a plus format, return as is
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }
  
  // If it's a 10-digit number, add +91 prefix
  if (digits.length === 10) {
    return "+91" + digits;
  }
  
  // Otherwise return the original input
  return phoneNumber;
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

export async function POST(request) {
  try {
    const body = await request.json();
    let { phoneNumber, otpCode } = body;
    
    // Format the phone number (add +91 prefix if it's a 10-digit number)
    phoneNumber = formatPhoneNumber(phoneNumber);

    // Validate phone number and OTP
    if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json({
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.'
      }, { status: 400 });
    }

    if (!otpCode || otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      return NextResponse.json({
        message: 'Invalid OTP. Please provide a valid 6-digit OTP.'
      }, { status: 400 });
    }

    // Attempt to verify OTP
    const verificationResult = await verifyOTP(phoneNumber, otpCode);
    console.log('Verification result:', verificationResult);
    
    if (!verificationResult.success) {
      return NextResponse.json({
        message: verificationResult.message
      }, { status: 400 });
    }

    // Check if a user already exists with this phone number
    const userCheck = await checkUserExists(phoneNumber);
    
    return NextResponse.json({
      message: 'OTP verified successfully',
      isNewUser: !userCheck.exists,
      userId: userCheck.userId || null
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
    return NextResponse.json({
      message: 'Failed to verify OTP. Please try again later.'
    }, { status: 500 });
  }
} 