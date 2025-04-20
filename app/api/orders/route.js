import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken'; // Use jsonwebtoken library
import { cookies } from 'next/headers'; // Import cookies

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET; // Get secret from environment

export async function GET(request) {
  try {
    // --- 1. Authentication (Using httpOnly Cookie) ---
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get('accessToken'); // Read the accessToken cookie
    const token = tokenCookie?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No auth cookie provided' }, { status: 401 });
    }

    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // Ensure the decoded payload has the user ID (adjust property name if needed)
      if (!decoded || typeof decoded.userId !== 'string') {
        throw new Error('Invalid token payload');
      }
      userId = decoded.userId;
    } catch (error) {
      console.error('Token verification failed:', error.message);
       // If access token is invalid/expired, we just return 401.
       // The frontend (userAuthFetch) will attempt to refresh.
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    console.log(`Fetching orders for user ID: ${userId}`);

    // --- 2. Fetch Orders from Database ---
    const orders = await prisma.order.findMany({
      where: {
        userId: userId, // Filter orders by the authenticated user's ID
      },
      include: {
        // Include related data you want to display on the frontend
        items: {
          include: {
            product: { // Include basic product info for display
              select: {
                name: true,
                images: true, // Include product images if needed
              }
            }
          }
        },
        address: true, // Corrected relation name from shippingAddress to address
      },
      orderBy: {
        createdAt: 'desc', // Show newest orders first
      },
    });

    console.log(`Found ${orders.length} orders for user ${userId}`);

    // --- 3. Return Response ---
    return NextResponse.json(orders, { status: 200 });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
} 