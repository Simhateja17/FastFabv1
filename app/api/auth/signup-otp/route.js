import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { phone } = await request.json();

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, message: "Valid phone number is required" },
        { status: 400 }
      );
    }

    // Format phone number - ensure it has a +91 prefix
    const formattedPhone = phone.startsWith("+") 
      ? phone 
      : `+91${phone.replace(/^91/, '')}`;

    // Check if the seller already exists
    const existingSeller = await prisma.seller.findUnique({
      where: { phone: formattedPhone }
    });

    if (existingSeller) {
      // If seller exists but we're coming from the OTP flow, provide JWT tokens
      // This allows an existing seller to sign in through the signup flow with OTP
      
      // Generate tokens
      const accessToken = jwt.sign(
        { sellerId: existingSeller.id, role: "seller" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const refreshToken = jwt.sign(
        { sellerId: existingSeller.id, role: "seller" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      // Store refresh token in database (optional)
      await prisma.token.create({
        data: {
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          sellerId: existingSeller.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Seller authenticated with OTP",
        accessToken,
        refreshToken,
        seller: existingSeller,
      });
    }

    // Create a new seller
    const newSeller = await prisma.seller.create({
      data: {
        phone: formattedPhone,
        email: "", // Can be updated later
        name: "", // Can be updated later
        isActive: true,
      },
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { sellerId: newSeller.id, role: "seller" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { sellerId: newSeller.id, role: "seller" },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in database
    await prisma.token.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        sellerId: newSeller.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Seller registered successfully with OTP",
      accessToken,
      refreshToken,
      seller: newSeller,
    });
  } catch (error) {
    console.error("Seller OTP registration error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Registration failed" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 