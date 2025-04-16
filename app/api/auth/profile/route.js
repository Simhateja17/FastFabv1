import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/app/lib/auth'; // Assuming auth verifies the request

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // 1. Verify Authentication 
    const authResult = await auth(request);
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 });
    }
    
    const sellerId = authResult.sellerId;

    // 2. Fetch seller data from database
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      // Select all necessary fields that the profile page needs
      select: {
        id: true,
        phone: true,
        shopName: true,
        ownerName: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        openTime: true,
        closeTime: true,
        categories: true,
        createdAt: true,
        updatedAt: true,
        latitude: true,
        longitude: true,
        isPhoneVerified: true,
        gstNumber: true,
        isVisible: true,
        manuallyHidden: true
        // Do NOT select password
      }
    });

    if (!seller) {
      return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
    }

    // 3. Return data in the expected format
    return NextResponse.json({ success: true, seller: seller });

  } catch (error) {
    console.error("Failed to fetch seller profile:", error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile. Please try again.' },
      { status: 500 }
    );
  } finally {
     // Avoid disconnecting in serverless/long-running apps per Prisma recommendation
     // await prisma.$disconnect(); 
  }
} 