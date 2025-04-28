import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken'; // Use jsonwebtoken library
import { cookies } from 'next/headers'; // Import cookies

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET; // Get secret from environment

// Helper function to get formatted status message
function getReturnStatusMessage(status) {
  switch (status) {
    case 'APPROVED':
      return 'Return Accepted';
    case 'REJECTED':
      return 'Return Rejected';
    case 'PENDING':
      return 'Submitted for Return';
    default:
      return null;
  }
}

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
      // Use `select` instead of `include` to explicitly choose fields
      // and exclude the non-existent `shippingAddress`
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        addressId: true,
        discount: true,
        shippingFee: true,
        tax: true,
        notes: true,
        deliveryNotes: true,
        estimatedDelivery: true,
        trackingNumber: true,
        deliveredAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        sellerPhone: true,
        adminNotified: true,
        customerNotified: true,
        primarySellerId: true,
        adminProcessed: true,
        adminNotes: true,
        sellerConfirmed: true,
        // Select the related address and its fields
        address: {
          select: {
            id: true,
            name: true,
            phone: true,
            line1: true,
            line2: true,
            city: true,
            state: true,
            pincode: true,
            country: true
          }
        },
        // Select the related items and their fields (including nested product)
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            sellerId: true,
            quantity: true,
            size: true,
            color: true,
            price: true,
            discount: true,
            // Select necessary product fields from the nested relation
            product: {
              select: {
                name: true,
                images: true,
                isReturnable: true,
              }
            }
          }
        },
        // Include any return requests for this order
        returnRequests: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            reason: true,
            orderItemId: true,
            productName: true
          },
          orderBy: {
            submittedAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc', // Show newest orders first
      },
    });

    console.log(`Found ${orders.length} orders for user ${userId}`);

    // Process orders to include return status information
    const processedOrders = orders.map(order => {
      // Check if there are any return requests for this order
      const hasReturnRequests = order.returnRequests && order.returnRequests.length > 0;
      const latestReturnRequest = hasReturnRequests ? order.returnRequests[0] : null;
      
      return {
        ...order,
        // Add returnStatus field with the latest return status
        returnStatus: latestReturnRequest ? latestReturnRequest.status : null,
        // Add formatted return status message
        returnStatusMessage: latestReturnRequest ? getReturnStatusMessage(latestReturnRequest.status) : null
      };
    });

    // --- 3. Return Response ---
    return NextResponse.json(processedOrders, { status: 200 });

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