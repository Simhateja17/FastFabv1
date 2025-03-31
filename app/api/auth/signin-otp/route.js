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

    // Check if the seller exists
    const seller = await prisma.seller.findUnique({
      where: { phone: formattedPhone }
    });

    if (!seller) {
      return NextResponse.json(
        { success: false, message: "Seller not found. Please sign up." },
        { status: 404 }
      );
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { sellerId: seller.id, role: "seller" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { sellerId: seller.id, role: "seller" },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in database
    await prisma.token.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        sellerId: seller.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      seller,
    });
  } catch (error) {
    console.error("Seller OTP login error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Login failed" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 