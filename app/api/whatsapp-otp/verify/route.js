import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Initialize Prisma with a connection pool for better stability
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

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
 * Verify OTP from database
 */
const verifyOTP = async (phoneNumber, otpCode) => {
  try {
    console.log('Verifying OTP in database for phone:', phoneNumber, 'code:', otpCode);
    
    // Find the latest non-expired, non-verified OTP
    const otp = await prisma.whatsAppOTP.findFirst({
      where: {
        phoneNumber,
        expiresAt: { gt: new Date() },
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!otp) {
      console.log('No valid OTP found for this phone number');
      return { success: false, message: 'No valid OTP found or OTP expired. Please request a new one.' };
    }
    
    console.log('Found OTP in database:', otp.id);
    
    // Compare the OTP code
    if (otp.otpCode === otpCode) {
      // Mark as verified
      await prisma.whatsAppOTP.update({
        where: { id: otp.id },
        data: { 
          verified: true,
          updatedAt: new Date()
        },
      });
      
      console.log('OTP verified successfully in database:', otp.id);
      return { success: true };
    }
    
    console.log('OTP code mismatch. Verification failed.');
    return { success: false, message: 'Invalid OTP code. Please try again.' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Check if user exists by phone number
 */
const checkUserExists = async (phoneNumber) => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { phone: phoneNumber }
    });
    
    if (existingUser) {
      return { exists: true, userId: existingUser.id, user: existingUser };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
};

/**
 * Create a new user with the verified phone number
 */
const createUser = async (phoneNumber, name = null, email = null) => {
  try {
    // Generate a default password (user will be prompted to change it)
    const defaultPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto.createHash('sha256').update(defaultPassword).digest('hex');
    
    const newUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        phone: phoneNumber,
        email: email,
        name: name || 'New User',
        password: hashedPassword,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    return { 
      success: true, 
      userId: newUser.id, 
      newUser: true
    };
  } catch (error) {
    console.error('Error creating new user:', error);
    throw error;
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    let { phoneNumber, otpCode, name, email } = body;
    
    console.log('OTP verification request received:', { 
      phoneNumber, 
      otpCodeLength: otpCode?.length,
      hasName: !!name,
      hasEmail: !!email
    });
    
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
    let response = {
      success: true,
      verified: true,
      message: 'Phone number verified successfully',
    };
    
    // If user doesn't exist, we'll create a new one
    if (!userCheck.exists) {
      console.log('User does not exist, creating new user');
      try {
        const createResult = await createUser(phoneNumber, name, email);
        response = {
          ...response,
          ...createResult,
          message: 'Phone number verified and account created successfully'
        };
      } catch (createError) {
        console.error('Error creating new user account:', createError);
        // Still return success for verification, but with error info
        response.accountCreationError = 'Failed to create user account. Please contact support.';
      }
    } else {
      response.userId = userCheck.userId;
      response.newUser = false;
      response.message = 'Phone number verified successfully. Welcome back!';
      console.log('Existing user found:', userCheck.userId);
      
      // Update isPhoneVerified flag if needed
      if (!userCheck.user.isPhoneVerified) {
        try {
          await prisma.user.update({
            where: { id: userCheck.userId },
            data: { 
              isPhoneVerified: true,
              updatedAt: new Date() 
            }
          });
          console.log('Updated isPhoneVerified flag for existing user');
        } catch (updateError) {
          console.error('Error updating user verification status:', updateError);
        }
      }
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing verification request:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: error.message
    }, { status: 500 });
  }
} 