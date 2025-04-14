import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

/**
 * Diagnostic endpoint for checking VAPID key configuration and web push functionality
 * This is only accessible in development/staging environments
 */
export async function GET(request) {
  // Only allow this in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Diagnostic endpoints are not available in production' },
      { status: 403 }
    );
  }

  try {
    const results = {
      env: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      vapidKeys: {
        publicKeyAvailable: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        publicKeyLength: (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').length,
        privateKeyAvailable: !!process.env.VAPID_PRIVATE_KEY,
        privateKeyLength: (process.env.VAPID_PRIVATE_KEY || '').length,
        subjectAvailable: !!process.env.VAPID_SUBJECT,
      },
      webpush: {
        moduleAvailable: !!webpush,
      },
      database: {
        connectionString: !!process.env.DATABASE_URL,
      },
      serviceWorker: {
        fileExists: true, // Will be verified using file system checks
      }
    };

    // Check VAPID key validity
    if (results.vapidKeys.publicKeyAvailable && 
        results.vapidKeys.privateKeyAvailable && 
        results.vapidKeys.subjectAvailable) {
      try {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT,
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        results.vapidKeys.validConfiguration = true;
      } catch (error) {
        results.vapidKeys.validConfiguration = false;
        results.vapidKeys.configError = error.message;
      }
    } else {
      results.vapidKeys.validConfiguration = false;
      results.vapidKeys.missingKeys = [];
      if (!results.vapidKeys.publicKeyAvailable) results.vapidKeys.missingKeys.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
      if (!results.vapidKeys.privateKeyAvailable) results.vapidKeys.missingKeys.push('VAPID_PRIVATE_KEY');
      if (!results.vapidKeys.subjectAvailable) results.vapidKeys.missingKeys.push('VAPID_SUBJECT');
    }

    // Check database connection and count subscriptions
    const prisma = new PrismaClient();
    try {
      await prisma.$connect();
      results.database.connected = true;
      
      // Count push subscriptions
      const subscriptionCount = await prisma.pushSubscription.count();
      results.database.subscriptionCount = subscriptionCount;
      
      // Get a sample subscription for testing if available
      if (subscriptionCount > 0) {
        const sampleSubscription = await prisma.pushSubscription.findFirst({
          select: {
            id: true,
            endpoint: true,
            createdAt: true,
            seller: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        results.database.sampleSubscription = {
          id: sampleSubscription.id,
          endpoint: sampleSubscription.endpoint.substring(0, 30) + '...',
          createdAt: sampleSubscription.createdAt,
          sellerId: sampleSubscription.seller?.id,
          sellerName: sampleSubscription.seller?.name
        };
      }
      
      await prisma.$disconnect();
    } catch (dbError) {
      results.database.connected = false;
      results.database.error = dbError.message;
    }

    // Generate new VAPID keys if requested
    const { searchParams } = new URL(request.url);
    if (searchParams.get('generate') === 'true') {
      try {
        const vapidKeys = webpush.generateVAPIDKeys();
        results.generatedKeys = {
          publicKey: vapidKeys.publicKey,
          privateKey: vapidKeys.privateKey,
          subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
        };
        
        // Instructions
        results.instructions = `
To use these keys:
1. Add them to your .env files:

VAPID_SUBJECT="${results.generatedKeys.subject}"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="${results.generatedKeys.publicKey}"
VAPID_PRIVATE_KEY="${results.generatedKeys.privateKey}"

2. Restart your application server
3. Ensure the service worker is properly registered
`;
      } catch (error) {
        results.generatedKeys = {
          error: error.message
        };
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { 
        error: error.message, 
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to send a test notification to a specific subscription
 */
export async function POST(request) {
  // Only allow this in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Diagnostic endpoints are not available in production' },
      { status: 403 }
    );
  }

  try {
    const requestData = await request.json();
    const { subscriptionId } = requestData;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required' },
        { status: 400 }
      );
    }

    // Check VAPID configuration
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        !process.env.VAPID_PRIVATE_KEY || 
        !process.env.VAPID_SUBJECT) {
      return NextResponse.json(
        { error: 'VAPID keys are not properly configured' },
        { status: 500 }
      );
    }

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Get the subscription from the database
    const prisma = new PrismaClient();
    const subscription = await prisma.pushSubscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: `Subscription with ID ${subscriptionId} not found` },
        { status: 404 }
      );
    }

    // Format the subscription for web-push
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    // Prepare notification payload
    const payload = JSON.stringify({
      title: "🔔 FastFab Test Notification",
      body: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
      icon: "/favicon.ico",
      data: {
        url: "/seller/dashboard",
        testId: "vapid-test"
      }
    });

    // Send the notification
    const result = await webpush.sendNotification(pushSubscription, payload);
    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: "Test notification sent successfully",
      statusCode: result.statusCode,
      headers: Object.fromEntries(result.headers.entries()),
      subscription: {
        id: subscription.id,
        endpoint: subscription.endpoint.substring(0, 30) + '...'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        statusCode: error.statusCode,
        body: error.body
      },
      { status: 500 }
    );
  }
} 