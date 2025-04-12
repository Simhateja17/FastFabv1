import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from "@/app/lib/auth"; // Assuming auth middleware provides sellerId

const prisma = new PrismaClient();

/**
 * POST handler to save a new web push subscription for the authenticated seller.
 */
export async function POST(request) {
  try {
    // 1. Authenticate the seller
    const authResult = await auth(request);
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
    } catch (e) {
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
          // createdAt and updatedAt are handled by default/ @updatedAt
        },
      });

      console.log(`Subscription saved/updated for seller ${sellerId}, endpoint: ${endpoint}`);
      return NextResponse.json(
        { success: true, subscriptionId: savedSubscription.id },
        { status: 201 } // 201 Created or 200 OK if updated
      );

    } catch (dbError) {
      console.error("Database error saving subscription:", dbError);
      // Log specific Prisma errors if needed (e.g., P2002 for unique constraint)
      if (dbError.code === 'P2003') { // Foreign key constraint failed (e.g., sellerId invalid)
         return NextResponse.json(
          { success: false, error: "Invalid seller reference." },
          { status: 400 }
        );
      }
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
  } finally {
    // Disconnect Prisma client if necessary, depending on your setup
    // await prisma.$disconnect(); // Often handled globally
  }
}

// Optional: Add a GET handler if needed for retrieving subscriptions (e.g., for debugging)
// export async function GET(request) { ... }

// Optional: Add a DELETE handler for unsubscribing
// export async function DELETE(request) { ... } 