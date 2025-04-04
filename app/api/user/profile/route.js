import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Create a Prisma client instance with better error handling
let prisma;

const initPrisma = async () => {
  if (!prisma) {
    try {
      prisma = new PrismaClient();
      await prisma.$connect();
      console.log('Prisma connected successfully for user profile');
    } catch (error) {
      console.error('Prisma initialization error:', error);
      throw error;
    }
  }
  return prisma;
};

/**
 * Verify JWT access token
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-key-for-development'
    );
    
    // Check if we have a userId field, and if not, check for sub claim which is standard JWT
    if (!decoded.userId && decoded.sub) {
      decoded.userId = decoded.sub;
    }
    
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Middleware to extract user ID from cookies or authorization header
 */
const extractUserIdFromToken = (request) => {
  // First try to get the token from cookies
  const cookies = request.cookies;
  const accessTokenFromCookie = cookies.get('accessToken')?.value;
  
  // If we have a token from cookies, use it
  if (accessTokenFromCookie) {
    console.log('Found access token in cookies');
    const decoded = verifyToken(accessTokenFromCookie);
    if (decoded) {
      console.log('Successfully verified token from cookies');
      return decoded.userId;
    }
  }
  
  // If no valid token in cookies, check the authorization header as fallback
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token in cookies and missing or invalid authorization header');
    return null;
  }
  
  // Extract the token from the header
  const token = authHeader.split(' ')[1];
  
  // Verify the token
  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('Invalid token or token verification failed');
    return null;
  }
  
  return decoded.userId;
};

// GET handler to retrieve user profile
export async function GET(request) {
  console.log('Profile request received');
  
  try {
    // Extract user ID from token
    const userId = extractUserIdFromToken(request);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      }, { status: 401 });
    }
    
    console.log('Authenticated user ID:', userId);
    
    // Get user profile from database
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
        // Don't include sensitive information
      }
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }
    
    // Return user profile
    return NextResponse.json({
      success: true,
      user
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({
      success: false,
      message: 'Error fetching user profile: ' + error.message
    }, { status: 500 });
  }
}

// PATCH handler to update user profile
export async function PATCH(request) {
  try {
    // Extract user ID from token
    const userId = extractUserIdFromToken(request);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      }, { status: 401 });
    }
    
    // Get update data from request body
    const updateData = await request.json();
    
    // Initialize Prisma
    const db = await initPrisma();
    
    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: updateData.name,
        email: updateData.email,
        // Only update fields that are provided in the request
        ...(updateData.phone && { phone: updateData.phone }),
        // Don't allow updating sensitive information like password via this endpoint
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({
      success: false,
      message: 'Error updating user profile: ' + error.message
    }, { status: 500 });
  }
} 