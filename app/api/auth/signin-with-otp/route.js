import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

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
    console.log('OTP sign-in request received');
    
    // Get phone from request
    const { phone } = await request.json();
    
    if (!phone) {
      console.error('No phone number provided');
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the seller service
    const apiUrl = process.env.SELLER_SERVICE_URL || 'http://localhost:8000';
    // The correct endpoint for OTP login on the seller service
    const endpoint = `${apiUrl}/api/auth/seller-otp-login`;
    
    console.log(`Forwarding OTP sign-in request to: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });
    
    console.log(`OTP sign-in response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to sign in';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If not JSON, use text as is
        console.error('Non-JSON error response from sign-in endpoint:', errorText);
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('OTP sign-in successful, setting tokens');
    
    // Set cookies for tokens
    const cookieStore = cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set access token cookie
    if (data.accessToken) {
      await cookieStore.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 15, // 15 minutes in seconds
        path: '/',
      });
    }
    
    // Set refresh token cookie
    if (data.refreshToken) {
      await cookieStore.set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
        path: '/',
      });
    }
    
    // Return the response as is - tokens will still be available to client
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('OTP sign-in error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to sign in', error: error.message },
      { status: 500 }
    );
  }
} 