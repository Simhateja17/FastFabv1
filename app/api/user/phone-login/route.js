import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone } = body;
    
    console.log('Phone login request received for:', phone);

    if (!phone) {
      console.log('Missing phone number in request');
      return NextResponse.json({ 
        message: 'Phone number is required' 
      }, { status: 400 });
    }

    // Find user by phone number
    const user = await prisma.user.findUnique({
      where: { phone }
    });
    
    console.log('User lookup result:', user ? `Found user ${user.id}` : 'No user found');

    if (!user) {
      // Instead of returning 404, return success: false
      return NextResponse.json({ 
        success: false,
        message: 'User not found with this phone number'
      }, { status: 200 });
    }

    // Generate tokens (this would normally involve JWT creation)
    const tokens = {
      accessToken: "mock-access-token-" + Date.now(),
      refreshToken: "mock-refresh-token-" + Date.now()
    };

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