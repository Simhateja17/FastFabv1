import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email = '', phone, isPhoneVerified } = body;
    
    console.log('Registration request received:', { name, email, phone, isPhoneVerified });

    // Validate required fields
    if (!name || !phone) {
      console.log('Validation failed: Missing required fields');
      return NextResponse.json({ 
        success: false,
        message: 'Name and phone are required' 
      }, { status: 400 });
    }

    // Check if user with this phone already exists - only check phone since we're doing WhatsApp OTP
    const existingUser = await prisma.user.findFirst({
      where: { phone }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      return NextResponse.json({ 
        success: false,
        message: 'User with this phone number already exists',
        user: {
          id: existingUser.id,
          name: existingUser.name,
          phone: existingUser.phone
        }
      }, { status: 200 }); // Return 200 instead of 400 to allow client to handle it better
    }

    console.log('Creating new user...');
    // Create the new user - make email optional by providing empty string if not provided
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email || '', // Make email optional by defaulting to empty string
        phone,
        password: "phone-auth-" + Math.random().toString(36).substring(2, 15), // Generate a random password for phone auth users
        isPhoneVerified: isPhoneVerified || false,
      }
    });
    
    console.log('User created successfully:', newUser.id);

    // Generate tokens (this would normally involve JWT creation)
    const tokens = {
      accessToken: "mock-access-token-" + Date.now(),
      refreshToken: "mock-refresh-token-" + Date.now()
    };

    // Return the created user and tokens
    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          createdAt: newUser.createdAt,
          isPhoneVerified: newUser.isPhoneVerified
        },
        tokens
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in user registration:', error);
    
    // Handle Prisma errors more specifically
    if (error.code === 'P2002') {
      // This is a unique constraint violation
      const field = error.meta?.target?.[0] || 'field';
      return NextResponse.json({ 
        success: false,
        message: `A user with this ${field} already exists.`,
        code: error.code
      }, { status: 400 });
    }
    
    // Handle other database connection errors
    if (error.code && error.code.startsWith('P1')) {
      return NextResponse.json({ 
        success: false,
        message: 'Database connection error. Please try again later.',
        code: error.code
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      success: false,
      message: 'Registration failed. Please try again: ' + error.message
    }, { status: 500 });
  }
} 