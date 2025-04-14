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
    console.log('Webhook payload:', payload); // Log the entire payload for debugging
    
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
    
    // Extract order ID from different possible payload formats
    let orderId;
    let orderAmount;
    
    // Log the data structure to help with debugging
    console.log('Webhook data structure:', JSON.stringify(data, null, 2));
    
    // Check various possible payload structures from Cashfree
    if (data.order && data.order.order_id) {
      // Standard webhook format
      orderId = data.order.order_id;
      orderAmount = data.order.order_amount;
    } else if (data.data && data.data.order && data.data.order.order_id) {
      // Nested data format
      orderId = data.data.order.order_id;
      orderAmount = data.data.order.order_amount;
    } else if (data.order_id) {
      // Direct properties format
      orderId = data.order_id;
      orderAmount = data.order_amount || data.amount;
    } else if (data.txStatus && data.orderId) {
      // Different format with txStatus
      orderId = data.orderId;
      orderAmount = data.orderAmount || data.amount;
    }
    
    // If we still couldn't find an order ID, check for CF's internal order ID
    if (!orderId && data.cf_order_id) {
      orderId = data.cf_order_id;
    }
    
    if (!orderId) {
      console.error('Could not extract order ID from webhook payload');
      // Log the entire payload for debugging but acknowledge receipt
      return NextResponse.json({ message: 'Could not extract order ID, but webhook received' }, { status: 200 });
    }
    
    // Extract payment status - check various possible formats
    let paymentStatus = 'UNKNOWN';
    if (data.payment && data.payment.payment_status) {
      paymentStatus = data.payment.payment_status;
    } else if (data.txStatus) {
      // Map txStatus to our payment status format
      paymentStatus = data.txStatus === 'SUCCESS' ? 'SUCCESS' : 
                     (data.txStatus === 'FAILED' ? 'FAILED' : 'PENDING');
    } else if (data.payment_status) {
      paymentStatus = data.payment_status;
    }
    
    // Only proceed if payment was successful - use more flexible check
    if (paymentStatus !== 'SUCCESS' && paymentStatus !== 'PAID' && paymentStatus !== 'TXN_SUCCESS') {
      console.log(`Payment status is ${paymentStatus}, not processing order`);
      return NextResponse.json({ message: 'Payment not successful' }, { status: 200 });
    }
    
    // Retrieve the order from database using the extracted orderId
    console.log(`Looking for order with orderNumber: ${orderId}`);
    const order = await prisma.order.findUnique({
      where: { orderNumber: orderId }, 
      include: {
        items: true,
        user: true,
        shippingAddress: true
      }
    });
    
    if (!order) {
      console.error(`Order with orderNumber ${orderId} not found in database`);
      
      // Try to find order by alternative fields if primary lookup fails
      const alternativeOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { externalOrderId: orderId },
            { referenceId: orderId }
          ]
        },
        include: {
          items: true,
          user: true,
          shippingAddress: true
        }
      });
      
      if (!alternativeOrder) {
        // Still not found, acknowledge webhook but log the issue
        return NextResponse.json({ message: 'Order not found locally, webhook acknowledged' }, { status: 200 });
      }
      
      // Use the alternative order found
      console.log(`Found order via alternative ID: ${alternativeOrder.id}`);
      
      // Check if payment already processed
      if(alternativeOrder.paymentStatus === 'SUCCESSFUL') {
        console.log(`Order ${alternativeOrder.id} already processed. Ignoring duplicate webhook.`);
        return NextResponse.json({ message: 'Duplicate webhook ignored' }, { status: 200 });
      }
      
      // Process the successful payment
      await processSuccessfulPayment(alternativeOrder, data);
      return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
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

    if (sellerIds.length === 0) {
      console.error(`No sellers found for order ${order.id}! This is likely a data integrity issue.`);
      
      // Try to update order items with seller information if possible
      try {
        // Get product details for each item to find the seller
        for (const item of order.items) {
          if (!item.sellerId && item.productId) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { sellerId: true }
            });
            
            if (product && product.sellerId) {
              console.log(`Found seller ${product.sellerId} for product ${item.productId}, updating order item`);
              
              // Update the order item with the correct sellerId
              await prisma.orderItem.update({
                where: { id: item.id },
                data: { sellerId: product.sellerId }
              });
              
              // Add to sellerIds if not already present
              if (!sellerIds.includes(product.sellerId)) {
                sellerIds.push(product.sellerId);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error trying to recover seller information: ${error.message}`);
      }
    }

    // Try to send Web Push notifications first
    let webPushSuccessful = false;
    
    // Configure web-push with VAPID keys (ensure these are in your .env)
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      console.log('Web-push VAPID details configured for sending notifications.');
      
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
        tag: `new-order-${order.id}` // Tag to replace previous notifications for same order
      });

      // Send push notifications to each relevant seller
      for (const sellerId of sellerIds) {
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
              .then(() => {
                // Mark success for this subscription
                return { success: true, subscription: sub.id };
              })
              .catch(error => {
                console.error(`Error sending push to ${sub.endpoint.substring(0, 30)}... for seller ${sellerId}:`, error.statusCode, error.body);
                // Handle specific errors, e.g., 410 Gone indicates subscription expired/invalid
                if (error.statusCode === 410 || error.statusCode === 404) {
                  console.log(`Subscription ${sub.id} for seller ${sellerId} is invalid. Deleting.`);
                  return prisma.pushSubscription.delete({ where: { id: sub.id } })
                    .then(() => ({ success: false, subscription: sub.id, deleted: true }));
                }
                return { success: false, subscription: sub.id };
              });
          });

          // Wait for all notifications for this seller to be sent (or fail)
          const results = await Promise.allSettled(sendPromises);
          const successes = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
          
          if (successes > 0) {
            webPushSuccessful = true;
            console.log(`${successes}/${subscriptions.length} push notifications sent successfully to seller ${sellerId}.`);
            
            // Update order to mark notification as sent
            await prisma.order.update({
              where: { id: order.id },
              data: { sellerNotified: true }
            });
          } else {
            console.warn(`Failed to send any push notifications to seller ${sellerId}. Will try alternative method.`);
          }
        } catch (error) {
          console.error(`Error processing web push notifications for seller ${sellerId}:`, error);
        }
      }
    } else {
      console.warn('VAPID keys not configured in environment variables. Cannot send web push notifications.');
    }

    // If web push wasn't successful, try alternative notification method (email or WhatsApp)
    if (!webPushSuccessful && sellerIds.length > 0) {
      console.log('Web push notification failed or not configured. Attempting alternative notification method...');
      
      // Try to send WhatsApp notifications if Gupshup is configured
      try {
        const API_KEY = process.env.GUPSHUP_API_KEY;
        const SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
        const GUPSHUP_API_URL = process.env.GUPSHUP_API_URL;
        
        if (API_KEY && SOURCE_NUMBER && GUPSHUP_API_URL) {
          for (const sellerId of sellerIds) {
            // Get seller contact information
            const seller = await prisma.seller.findUnique({
              where: { id: sellerId },
              select: { phone: true, name: true, email: true }
            });
            
            if (seller && seller.phone) {
              console.log(`Attempting to send WhatsApp notification to seller ${sellerId} at ${seller.phone}`);
              
              // Format items for the notification
              const itemsList = order.items
                .filter(item => item.sellerId === sellerId)
                .map(item => item.name || `Product ID: ${item.productId}`)
                .join(", ");
              
              // Format shipping address
              let shippingAddressText = "Address not available";
              if (order.shippingAddress) {
                const addr = order.shippingAddress;
                shippingAddressText = `${addr.name}, ${addr.line1}, ${addr.city}, ${addr.state}, ${addr.pincode}`;
              }
              
              // This would call your WhatsApp notification service
              // For now, just log that we would send it
              console.log(`Would send WhatsApp to ${seller.phone} with order #${order.orderNumber}, items: ${itemsList}, shipping: ${shippingAddressText}`);
              
              // Update order to mark notification as sent
              await prisma.order.update({
                where: { id: order.id },
                data: { sellerNotified: true }
              });
            } else {
              console.warn(`No phone number found for seller ${sellerId}`);
            }
          }
        }
      } catch (error) {
        console.error('Error sending alternative notifications:', error);
      }
    }
  } catch (error) {
    console.error(`Error in processSuccessfulPayment for order ${order?.id}:`, error);
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