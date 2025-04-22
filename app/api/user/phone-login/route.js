import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Create a Prisma client instance with better error handling
let prisma;

const initPrisma = async () => {
  if (!prisma) {
    prisma = new PrismaClient();
    await prisma.$connect();
  }
  return prisma;
};

/**
 * Format phone number to ensure consistent storage format
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
  
  // Otherwise return with + prefix if missing
  return digits.startsWith("91") ? "+" + digits : "+" + digits;
};

/**
 * Generate JWT tokens for authentication with fallback for environments without JWT
 */
const generateTokens = (userId) => {
  try {
    // Try to use JWT if available
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'fallback-secret-key-for-development',
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development',
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('JWT generation failed, using fallback tokens:', error);
    // Fallback to simple tokens if JWT fails
    return {
      accessToken: `mock-access-token-${userId}-${Date.now()}`,
      refreshToken: `mock-refresh-token-${userId}-${Date.now()}`
    };
  }
};

/**
 * Set authentication cookies in the response
 */
const setAuthCookies = (accessToken, refreshToken) => {
  const cookieStore = cookies();
  
  // Set the access token cookie
  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60, // 15 minutes in seconds
    path: "/",
  });
  
  // Set the refresh token cookie
  cookieStore.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });
  
  console.log('Auth cookies set successfully');
};

export async function POST(request) {
  try {
    const body = await request.json();
    let { phone } = body;
    
    console.log('Phone login request received for:', phone);

    if (!phone) {
      console.log('Missing phone number in request');
      return NextResponse.json({ 
        success: false,
        message: 'Phone number is required' 
      }, { status: 400 });
    }
    
    // Format phone number consistently
    phone = formatPhoneNumber(phone);
    console.log('Formatted phone number:', phone);

    // Initialize Prisma and find user by phone number
    const db = await initPrisma();
    const user = await db.user.findFirst({
      where: { 
        phone: {
          equals: phone,
          mode: 'insensitive' // Case insensitive comparison
        }
      }
    });
    
    console.log('User lookup result:', user ? `Found user ${user.id}` : 'No user found');

    if (!user) {
      // Instead of returning 404, return success: false
      return NextResponse.json({ 
        success: false,
        message: 'No user found with this phone number'
      }, { status: 200 });
    }

    // Generate tokens with fallback
    const tokens = generateTokens(user.id);
    console.log('Generated tokens for user:', user.id);
    
    // Set auth cookies in response
    setAuthCookies(tokens.accessToken, tokens.refreshToken);
    console.log('Set auth cookies for user:', user.id);

    // Return user data and tokens
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt
        },
        tokens
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error in phone login:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Login failed: ' + error.message
    }, { status: 500 });
  }
}