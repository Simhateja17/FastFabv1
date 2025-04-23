import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Create a Prisma client instance
const prisma = new PrismaClient();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate JWT tokens
const generateTokens = (sellerId) => {
  // Create access token
  const accessToken = jwt.sign({ sellerId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  // Create refresh token
  const refreshToken = jwt.sign({ sellerId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

// Store refresh token in database
const storeRefreshToken = async (sellerId, refreshToken) => {
  try {
    // Remove any existing refresh tokens for this seller
    await prisma.refreshToken.deleteMany({
      where: { sellerId },
    });

    // Store the new refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        sellerId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Set to expire in 7 days
      },
    });
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw error;
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone } = body;

    console.log('[Seller Register] Request received:', phone);

    if (!phone) {
      return NextResponse.json({
        success: false,
        message: 'Phone number is required',
      }, { status: 400 });
    }

    // Format the phone number for database consistency
    let dbPhone = phone;
    if (phone.startsWith('+91')) {
      dbPhone = phone.substring(3); // Remove +91 prefix
    } else if (phone.startsWith('91') && phone.length === 12) {
      dbPhone = phone.substring(2); // Remove 91 prefix
    }

    // Check if seller already exists
    const existingSeller = await prisma.seller.findUnique({
      where: { phone: dbPhone },
    });

    if (existingSeller) {
      console.log('[Seller Register] Seller already exists:', existingSeller.id);
      return NextResponse.json({
        success: false,
        message: 'Phone number already registered',
      }, { status: 400 });
    }

    // Format phone for WhatsApp lookup
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      if (phone.length === 10) {
        formattedPhone = `+91${phone}`;
      } else if (phone.startsWith('91') && phone.length === 12) {
        formattedPhone = `+${phone}`;
      }
    }

    // Check if phone has been verified with OTP
    const verifiedOtp = await prisma.whatsAppOTP.findFirst({
      where: {
        phoneNumber: formattedPhone,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verifiedOtp) {
      console.log('[Seller Register] Phone not verified with OTP:', formattedPhone);
      return NextResponse.json({
        success: false,
        message: 'Phone number not verified. Please verify your phone with OTP first.',
        code: 'PHONE_NOT_VERIFIED',
      }, { status: 400 });
    }

    // Create new seller with verified phone
    // Use a secure random string as password placeholder - not for login
    const randomPasswordPlaceholder = Math.random().toString(36).substring(2, 15) + 
                                      Math.random().toString(36).substring(2, 15);
    
    const seller = await prisma.seller.create({
      data: {
        phone: dbPhone,
        password: randomPasswordPlaceholder, // Not used for login, just a placeholder
        isPhoneVerified: true,
        updatedAt: new Date(),
      },
    });

    console.log('[Seller Register] Seller created successfully:', seller.id);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(seller.id);

    // Store refresh token
    await storeRefreshToken(seller.id, refreshToken);

    // Set cookies for authentication
    const response = NextResponse.json({
      success: true,
      message: 'Seller registered successfully',
      seller: {
        id: seller.id,
        phone: seller.phone,
        isPhoneVerified: seller.isPhoneVerified,
      },
      accessToken,
      refreshToken,
    }, { status: 201 });

    // Set HttpOnly cookies for security
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes in seconds
      path: '/',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Seller Register] Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message,
    }, { status: 500 });
  }
} 