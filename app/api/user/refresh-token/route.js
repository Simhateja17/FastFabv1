import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Create a Prisma client instance
let prisma;

const initPrisma = async () => {
  if (!prisma) {
    try {
      prisma = new PrismaClient();
      await prisma.$connect();
      console.log('Prisma connected successfully for token refresh');
    } catch (error) {
      console.error('Prisma initialization error:', error);
      throw error;
    }
  }
  return prisma;
};

/**
 * Verify JWT refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development'
    );
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return null;
  }
};

/**
 * Generate new access and refresh tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    { expiresIn: '24h' } // Extended to 24 hours for better UX
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-for-development',
    { expiresIn: '90d' } // Extended to 90 days for better persistence
  );
  
  return { accessToken, refreshToken };
};

export async function POST(request) {
  try {
    console.log('Token refresh request received');
    
    // Get the refresh token from the request body
    const body = await request.json();
    const { refreshToken } = body;
    
    if (!refreshToken) {
      console.log('Missing refresh token in request');
      return NextResponse.json({
        success: false,
        message: 'Refresh token is required'
      }, { status: 400 });
    }
    
    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      console.log('Invalid or expired refresh token');
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired refresh token'
      }, { status: 401 });
    }
    
    const userId = decoded.userId;
    console.log('Refresh token valid for user:', userId);
    
    // Generate new tokens
    const tokens = generateTokens(userId);
    console.log('Generated new tokens for user:', userId);
    
    // Get user data to return with the tokens
    const db = await initPrisma();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    if (!user) {
      console.log('User not found for valid token');
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }
    
    // Return new tokens and user data
    return NextResponse.json({
      success: true,
      message: 'Token refresh successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user
    }, { status: 200 });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({
      success: false,
      message: 'Error refreshing token: ' + error.message
    }, { status: 500 });
  }
} 