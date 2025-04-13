import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma'; // Use the API-specific shared prisma instance
import { auth } from "@/app/lib/auth"; // Assuming auth middleware provides sellerId

/**
 * POST handler to save a new web push subscription for the authenticated seller.
 */
export async function POST(request) {
  try {
    // Add some logging to help troubleshoot
    console.log('Using Authorization header for authentication');
    
    // 1. Authenticate the seller
    const authResult = await auth(request);
    console.log('Auth result:', { success: authResult.success, sellerId: authResult.sellerId });
    
    if (!authResult.success || !authResult.sellerId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }
    const sellerId = authResult.sellerId;

    // 2. Parse the request body
    let subscription;
    try {
      subscription = await request.json();
      console.log('Received subscription object:', JSON.stringify(subscription).substring(0, 100) + '...');
    } catch (e) {
      console.error('Failed to parse JSON body:', e);
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    // 3. Validate the subscription object (basic check)
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error('Invalid subscription object received:', subscription);
      return NextResponse.json(
        { success: false, error: "Invalid subscription object format." },
        { status: 400 }
      );
    }

    // 4. Extract necessary fields
    const { endpoint, keys } = subscription;
    const { p256dh, auth: authKey } = keys; // Rename auth to authKey to avoid conflict

    // Check if seller exists in database
    try {
      const sellerExists = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { id: true }
      });
      
      if (!sellerExists) {
        console.error(`Seller with ID ${sellerId} does not exist in database`);
        return NextResponse.json(
          { success: false, error: "Seller not found in database." },
          { status: 400 }
        );
      }
      
      console.log(`Verified seller ${sellerId} exists in database`);
    } catch (sellerCheckError) {
      console.error('Error checking if seller exists:', sellerCheckError);
    }

    // Add logging to verify prisma is available
    console.log('Prisma client type:', typeof prisma, 'Is prisma defined:', !!prisma);
    console.log('Database URL defined:', !!process.env.DATABASE_URL);

    // 5. Save to database using Prisma
    try {
      // Use upsert to handle cases where the endpoint might already exist
      // (e.g., user re-subscribes). It updates if exists, creates if not.
      const savedSubscription = await prisma.pushSubscription.upsert({
        where: { endpoint: endpoint }, // Unique constraint
        update: {
          p256dh: p256dh,
          auth: authKey,
          sellerId: sellerId, // Ensure it's linked to the current seller
          updatedAt: new Date(), // Manually update timestamp
        },
        create: {
          endpoint: endpoint,
          p256dh: p256dh,
          auth: authKey,
          sellerId: sellerId,
          updatedAt: new Date(),
        },
      });

      console.log(`Subscription saved/updated for seller ${sellerId}, endpoint: ${endpoint}`);
      return NextResponse.json(
        { success: true, subscriptionId: savedSubscription.id },
        { status: 201 } // 201 Created or 200 OK if updated
      );

    } catch (dbError) {
      console.error("Database error saving subscription:", dbError);
      
      // More detailed error handling for common Prisma errors
      if (dbError.code === 'P2003') { // Foreign key constraint failed (e.g., sellerId invalid)
        return NextResponse.json(
          { success: false, error: "Invalid seller reference." },
          { status: 400 }
        );
      } else if (dbError.code === 'P2002') { // Unique constraint failed
        return NextResponse.json(
          { success: false, error: "Subscription endpoint already exists." },
          { status: 409 }
        );
      } else if (dbError.code === 'P1001') { // Database connection issues
        return NextResponse.json(
          { success: false, error: "Database connection error. Please try again later." },
          { status: 503 }
        );
      }
      
      // Generic error response
      return NextResponse.json(
        { success: false, error: "Could not save subscription to database." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error processing subscription POST request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

// Optional: Add a GET handler if needed for retrieving subscriptions (e.g., for debugging)
// export async function GET(request) { ... }

// Optional: Add a DELETE handler for unsubscribing
// export async function DELETE(request) { ... } 