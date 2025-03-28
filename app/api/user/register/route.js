import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a Prisma client instance
const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, isPhoneVerified } = body;
    
    console.log('Registration request received:', { name, email, phone, isPhoneVerified });

    // Validate required fields
    if (!name || !email || !phone) {
      console.log('Validation failed: Missing required fields');
      return NextResponse.json({ 
        message: 'Name, email, and phone are required' 
      }, { status: 400 });
    }

    // Check if user with this email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      return NextResponse.json({ 
        message: 'User with this email or phone already exists' 
      }, { status: 400 });
    }

    console.log('Creating new user...');
    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
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
    return NextResponse.json({ 
      message: 'Registration failed. Please try again: ' + error.message
    }, { status: 500 });
  }
} 