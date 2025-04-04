import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// Create a Prisma client instance
const prisma = new PrismaClient();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-for-development";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-key-for-development";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Generate JWT tokens
const generateTokens = (userId) => {
  // Create access token
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  // Create refresh token
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, isPhoneVerified } = body;

    console.log("Registration request received:", {
      name,
      phone,
      isPhoneVerified,
    });

    // Validate required fields
    if (!name || !phone) {
      console.log("Validation failed: Missing required fields");
      return NextResponse.json(
        {
          success: false,
          message: "Name and phone are required",
        },
        { status: 400 }
      );
    }

    // Check if user with this phone already exists - only check phone since we're doing WhatsApp OTP
    const existingUser = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingUser) {
      console.log("User already exists:", existingUser.id);
      // For existing users, generate tokens and set cookies
      const tokens = generateTokens(existingUser.id);
      
      // Set cookies
      const cookieStore = cookies();
      cookieStore.set("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 minutes in seconds
        path: "/",
      });
      cookieStore.set("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: "/",
      });
      
      console.log("Set auth cookies for existing user:", existingUser.id);
      
      return NextResponse.json(
        {
          success: true,
          message: "User already exists and is now logged in",
          user: {
            id: existingUser.id,
            name: existingUser.name,
            phone: existingUser.phone,
          },
          tokens,
        },
        { status: 200 }
      );
    }

    console.log("Creating new user...");
    // Create the new user - email is now optional
    const newUser = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`, // Generate a unique ID
        name,
        phone,
        email: null, // Explicitly set email to null
        password: "phone-auth-" + Math.random().toString(36).substring(2, 15), // Generate a random password for phone auth users
        isPhoneVerified: isPhoneVerified || false,
        updatedAt: new Date(), // Add current date for updatedAt
      },
    });

    console.log("User created successfully:", newUser.id);

    // Generate real JWT tokens instead of mock tokens
    const tokens = generateTokens(newUser.id);
    
    // Set auth cookies
    const cookieStore = cookies();
    cookieStore.set("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60, // 15 minutes in seconds
      path: "/",
    });
    cookieStore.set("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });
    
    console.log("Set auth cookies for new user:", newUser.id);

    // Return the created user and tokens
    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            createdAt: newUser.createdAt,
            isPhoneVerified: newUser.isPhoneVerified,
          },
          tokens,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in user registration:", error);

    // Handle Prisma errors more specifically
    if (error.code === "P2002") {
      // This is a unique constraint violation
      const field = error.meta?.target?.[0] || "field";
      return NextResponse.json(
        {
          success: false,
          message: `A user with this ${field} already exists.`,
          code: error.code,
        },
        { status: 400 }
      );
    }

    // Handle other database connection errors
    if (error.code && error.code.startsWith("P1")) {
      return NextResponse.json(
        {
          success: false,
          message: "Database connection error. Please try again later.",
          code: error.code,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Registration failed. Please try again: " + error.message,
      },
      { status: 500 }
    );
  }
}
