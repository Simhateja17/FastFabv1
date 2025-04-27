import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    // Check if JWT_SECRET is defined
    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not defined');
      return NextResponse.json(
        { error: 'Server configuration error: Missing JWT_SECRET' },
        { status: 500 }
      );
    }
    
    // Authenticate the user - Fix: Get cookies properly
    const cookieStore = cookies();
    
    // Access the token from cookie store (using either accessToken or userAccessToken)
    const token = 
      cookieStore.get('accessToken')?.value || 
      cookieStore.get('userAccessToken')?.value; // Try alternative cookie name

    if (!token) {
      console.error('Authentication failed: No token found in cookies');
      
      // Log all available cookies for debugging (except sensitive data)
      const allCookies = cookieStore.getAll().map(c => c.name);
      console.log('Available cookies:', allCookies);
      
      return NextResponse.json({ 
        error: 'Unauthorized: No auth cookie provided',
        availableCookies: allCookies
      }, { status: 401 });
    }

    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded || typeof decoded.userId !== 'string') {
        console.error('Invalid token payload:', decoded);
        throw new Error('Invalid token payload');
      }
      userId = decoded.userId;
      console.log(`Authenticated user ${userId} for return request`);
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    // Parse the request body
    const { orderId, reason, productName, price } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: true 
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify this is the user's order
    if (order.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized: This is not your order' }, { status: 403 });
    }

    // Find the specific item being returned (first item in this case)
    const itemToReturn = order.items[0];
    
    if (!itemToReturn) {
      return NextResponse.json({ error: 'No items found in this order' }, { status: 404 });
    }

    // Update the order item's return status
    await prisma.orderItem.update({
      where: { id: itemToReturn.id },
      data: {
        returnWindowStatus: "RETURNED",
        returnedAt: new Date(),
        // You could store the reason in a custom field or in a separate returns table
      }
    });

    // You could also create a separate return request record
    // This would be useful for tracking return reasons and other details
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: userId,
        orderItemId: itemToReturn.id,
        reason: reason,
        status: "PENDING",
        productName: productName || itemToReturn.productName,
        amount: parseFloat(price) || itemToReturn.price,
        submittedAt: new Date()
      }
    });

    console.log(`Successfully created return request ${returnRequest.id} for order ${orderId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Return request submitted successfully',
      data: { returnRequestId: returnRequest.id }
    });

  } catch (error) {
    console.error('Error processing return request:', error);
    return NextResponse.json(
      { error: 'Failed to process return request', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 