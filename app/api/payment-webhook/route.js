import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push'; // Import web-push
// Remove Gupshup notification imports as we replace them
// import { 
//   sendSellerOrderWithImage,
//   sendAdminOrderPendingSeller 
// } from '@/app/utils/notificationService';

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const SELLER_RESPONSE_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

/**
 * Validates Cashfree webhook signature
 * @param {Object} headers - Request headers
 * @param {string} payload - Raw request body as string
 * @param {string} secret - Cashfree secret key
 * @returns {boolean} Whether signature is valid
 */
const validateWebhookSignature = (headers, payload, secret) => {
  // In a production environment, implement proper signature validation
  // using the Cashfree signature verification method
  
  // For now, we'll accept all webhooks since this is development
  return true;
};

/**
 * Handler for Cashfree payment webhook
 */
export async function POST(request) {
  try {
    console.log('Received payment webhook from Cashfree');
    
    // Get the raw request body for signature verification
    const payload = await request.text();
    // console.log('Webhook payload:', payload); // Log only if debugging
    
    // Parse the payload to JSON
    let data;
    try {
      data = JSON.parse(payload);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }
    
    // Validate webhook signature
    const secret = process.env.CASHFREE_SECRET_KEY;
    
    if (!validateWebhookSignature(request.headers, payload, secret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 401 });
    }
    
    // Check for required fields
    if (!data.order || !data.order.order_id || !data.order.order_amount) {
      console.error('Missing required fields in webhook payload');
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Only proceed if payment was successful
    if (data.payment && data.payment.payment_status !== 'SUCCESS') {
      console.log(`Payment status is ${data.payment?.payment_status}, not processing order`);
      return NextResponse.json({ message: 'Payment not successful' }, { status: 200 });
    }
    
    // Extract order details
    const { order_id, order_amount } = data.order;
    
    // Retrieve the order from database
    // Use the order_id from Cashfree which likely corresponds to your orderNumber
    const order = await prisma.order.findUnique({
      where: { orderNumber: order_id }, 
      include: {
        items: true,
        user: true,
        shippingAddress: true
      }
    });
    
    if (!order) {
      console.error(`Order with orderNumber ${order_id} not found in database`);
      // Respond 200 OK even if order not found locally to acknowledge webhook
      return NextResponse.json({ message: 'Order not found locally, webhook acknowledged' }, { status: 200 });
    }
    
    // Check if payment already processed to prevent duplicate notifications
    if(order.paymentStatus === 'SUCCESSFUL') {
        console.log(`Order ${order.id} already processed. Ignoring duplicate webhook.`);
        return NextResponse.json({ message: 'Duplicate webhook ignored' }, { status: 200 });
    }

    // Process the successful payment
    await processSuccessfulPayment(order, data);
    
    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Process a successful payment: Update DB, send Web Push to Seller(s)
 * @param {Object} order - Order object from database
 * @param {Object} webhookData - Webhook data from Cashfree
 */
async function processSuccessfulPayment(order, webhookData) {
  try {
    console.log(`Processing successful payment for order ${order.id}`);

    // Configure web-push with VAPID keys (ensure these are in your .env)
    let vapidKeysConfigured = false;
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      vapidKeysConfigured = true;
      console.log('Web-push VAPID details configured for sending notifications.');
    } else {
      console.warn('VAPID keys not configured in environment variables. Cannot send web push notifications.');
    }

    // Calculate seller response deadline (3 minutes from now)
    const sellerResponseDeadline = new Date(Date.now() + SELLER_RESPONSE_TIMEOUT);
    
    // Update order status in DB
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PENDING', // Set to PENDING seller action
        paymentStatus: 'SUCCESSFUL',
        sellerResponseDeadline
      }
    });
    
    // Get unique seller IDs from order items
    const sellerIds = [...new Set(order.items.map(item => item.sellerId).filter(Boolean))];
    console.log(`Found ${sellerIds.length} unique seller(s) for order ${order.id}`);

    // Prepare notification payload (same for all sellers of this order)
    const notificationPayload = JSON.stringify({
        title: '📦 New Fast&Fab Order!',
        body: `Order #${order.orderNumber} requires your attention.`,
        icon: '/favicon.ico', // Optional: Path to an icon
        data: {
            orderId: order.id, // Send internal order ID
            orderNumber: order.orderNumber,
            url: `/seller/orders/${order.id}` // Link to open order page
        },
        // tag: `new-order-${order.id}` // Optional: tag to replace previous notifications for same order
    });

    // Send push notifications to each relevant seller
    for (const sellerId of sellerIds) {
        if (!vapidKeysConfigured) {
            console.log(`Skipping push notifications for seller ${sellerId} because VAPID keys are not configured.`);
            continue; // Skip to next seller if keys aren't set
        }

        try {
            // Get all active push subscriptions for this seller
            const subscriptions = await prisma.pushSubscription.findMany({
                where: { sellerId: sellerId }
            });

            if (!subscriptions || subscriptions.length === 0) {
                console.log(`No active push subscriptions found for seller ${sellerId}.`);
                continue; // Skip to next seller
            }

            console.log(`Found ${subscriptions.length} subscriptions for seller ${sellerId}. Sending notifications...`);

            // Send notification to each subscription endpoint
            const sendPromises = subscriptions.map(sub => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };
                return webpush.sendNotification(pushSubscription, notificationPayload)
                    .catch(error => {
                        console.error(`Error sending push to ${sub.endpoint.substring(0, 30)}... for seller ${sellerId}:`, error.statusCode, error.body);
                        // Handle specific errors, e.g., 410 Gone indicates subscription expired/invalid
                        if (error.statusCode === 410 || error.statusCode === 404) {
                            console.log(`Subscription ${sub.id} for seller ${sellerId} is invalid. Deleting.`);
                            return prisma.pushSubscription.delete({ where: { id: sub.id } });
                        }
                    });
            });

            // Wait for all notifications for this seller to be sent (or fail)
            await Promise.allSettled(sendPromises);
            console.log(`Push notifications sent attempt finished for seller ${sellerId}.`);

            // Update order flags (optional, if needed)
            // await prisma.order.update({ where: { id: order.id }, data: { sellerNotified: true } });

        } catch (error) {
            console.error(`Error processing notifications for seller ${sellerId}:`, error);
            // Continue to next seller even if one fails
        }
    }
    
    // NOTE: Admin notifications (e.g., via email or internal system) could be added here if needed.
    // We removed the direct Gupshup admin notification.

  } catch (error) {
    console.error(`Error in processSuccessfulPayment for order ${order?.id}:`, error);
    // Consider adding more robust error handling/logging here
    // Don't re-throw generally, allow webhook to return 200 OK if possible
  }
}

// Keep formatAddress function if needed elsewhere, otherwise can be removed
function formatAddress(address) {
  if (!address) return 'No address provided';
  const { name, line1, line2, city, state, pincode, country } = address;
  return [
    name,
    line1,
    line2,
    `${city}, ${state} ${pincode}`,
    country || 'India'
  ].filter(Boolean).join(', ');
} 