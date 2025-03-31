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
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-key-for-development'
    );
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Middleware to extract user ID from authorization header
 */
const extractUserIdFromToken = (request) => {
  // Get the authorization header from the request
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid authorization header');
    return null;
  }
  
  // Extract the token
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
    return NextResponse.json(user, { status: 200 });
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