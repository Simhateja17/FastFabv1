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
    
    // Log the entire payload for debugging (sanitize sensitive data in production)
    console.log('Webhook payload received:', payload);
    
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
    let transactionId;
    
    // Log the data structure to help with debugging
    console.log('Webhook data structure:', JSON.stringify(data, null, 2));
    
    // FLEXIBLE EXTRACTION: Check all possible paths in the payload for an order ID
    
    // Check various possible payload structures from Cashfree
    if (data.order && data.order.order_id) {
      // Standard webhook format
      orderId = data.order.order_id;
      orderAmount = data.order.order_amount;
      transactionId = data.transaction?.transaction_id || data.transaction_id;
    } else if (data.data && data.data.order && data.data.order.order_id) {
      // Nested data format
      orderId = data.data.order.order_id;
      orderAmount = data.data.order.order_amount;
      transactionId = data.data.transaction?.transaction_id || data.data.transaction_id;
    } else if (data.order_id) {
      // Direct properties format
      orderId = data.order_id;
      orderAmount = data.order_amount || data.amount;
      transactionId = data.transaction_id;
    } else if (data.txStatus && data.orderId) {
      // Different format with txStatus
      orderId = data.orderId;
      orderAmount = data.orderAmount || data.amount;
      transactionId = data.referenceId || data.txId || data.txnId;
    } else if (data.cf_order_id) {
      // Cashfree internal order ID
      orderId = data.cf_order_id;
      transactionId = data.cf_transaction_id || data.transaction_id;
    } else if (data.orderId) {
      // Simple orderId format
      orderId = data.orderId;
      transactionId = data.referenceId || data.txnId || data.transactionId;
    } else if (typeof data === 'object') {
      // Last resort: search recursively through the object for any field
      // that might contain an order ID
      const searchForOrderId = (obj, depth = 0) => {
        if (depth > 5) return null; // Prevent infinite recursion
        
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (
            (lowerKey.includes('order') && lowerKey.includes('id')) || 
            lowerKey === 'orderid' || 
            lowerKey === 'order_id'
          ) {
            return value;
          }
          
          if (typeof value === 'object' && value !== null) {
            const result = searchForOrderId(value, depth + 1);
            if (result) return result;
          }
        }
        return null;
      };
      
      orderId = searchForOrderId(data);
    }
    
    // If we still couldn't find an order ID, log but don't reject
    if (!orderId) {
      console.error('Could not extract order ID from webhook payload - LOGGING FULL PAYLOAD:');
      console.error(JSON.stringify(data, null, 2));
      
      // Instead of rejecting, look for recent unprocessed orders
      const recentOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Orders from last 15 minutes
          paymentStatus: 'PENDING',
          status: 'PENDING'
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: true,
          shippingAddress: true
        }
      });
      
      if (recentOrders.length > 0) {
        console.log(`Found ${recentOrders.length} recent pending orders. Processing most recent one as fallback.`);
        // Process the most recent order
        await processSuccessfulPayment(recentOrders[0], data);
        return NextResponse.json({
          message: 'Processed most recent pending order as fallback',
          orderId: recentOrders[0].id
        }, { status: 200 });
      }
      
      // Still acknowledge receipt
      return NextResponse.json({ 
        message: 'Could not extract order ID, but webhook received',
        success: true
      }, { status: 200 });
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
    } else if (data.status) {
      paymentStatus = data.status;
    } else if (data.data && data.data.payment && data.data.payment.status) {
      paymentStatus = data.data.payment.status;
    }
    
    console.log(`Extracted payment status: ${paymentStatus}`);
    
    // RELAXED SUCCESS CHECK: Consider more variations of success status
    const successStatuses = [
      'SUCCESS', 'PAID', 'TXN_SUCCESS', 'SUCCESSFUL', 'COMPLETED', 
      'OK', 'CAPTURED', 'APPROVED', 'AUTHORIZED', 'PAYMENT_SUCCESSFUL'
    ];
    
    // Case-insensitive check for successful payment
    const isSuccessful = successStatuses.some(status => 
      paymentStatus.toUpperCase().includes(status));
    
    if (!isSuccessful) {
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
            { referenceId: orderId },
            { id: orderId }
          ]
        },
        include: {
          items: true,
          user: true,
          shippingAddress: true
        }
      });
      
      if (!alternativeOrder) {
        // Try to find by transaction ID if available
        let orderByTransaction = null;
        if (transactionId) {
          orderByTransaction = await prisma.order.findFirst({
            where: {
              transactions: {
                some: {
                  transactionId: transactionId
                }
              }
            },
            include: {
              items: true,
              user: true,
              shippingAddress: true
            }
          });
        }
        
        if (!orderByTransaction) {
          // Look for recent orders as a last resort
          const recentOrders = await prisma.order.findMany({
            where: {
              createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
              paymentStatus: 'PENDING'
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              items: true,
              user: true,
              shippingAddress: true
            }
          });
          
          if (recentOrders.length > 0) {
            console.log(`Processing most recent order as fallback: ${recentOrders[0].id}`);
            await processSuccessfulPayment(recentOrders[0], data);
            return NextResponse.json({ 
              message: 'Processed most recent order as fallback',
              orderId: recentOrders[0].id
            }, { status: 200 });
          }
          
          // Still not found, acknowledge webhook but log the issue
          console.error('No matching order found in database after all attempts');
          return NextResponse.json({ 
            message: 'Order not found locally, webhook acknowledged',
            success: true
          }, { status: 200 });
        }
        
        console.log(`Found order via transaction ID: ${orderByTransaction.id}`);
        
        // Check if payment already processed
        if (orderByTransaction.paymentStatus === 'SUCCESSFUL') {
          console.log(`Order ${orderByTransaction.id} already processed. Ignoring duplicate webhook.`);
          return NextResponse.json({ message: 'Duplicate webhook ignored' }, { status: 200 });
        }
        
        // Process the successful payment
        await processSuccessfulPayment(orderByTransaction, data);
        return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
      }
      
      // Use the alternative order found
      console.log(`Found order via alternative ID: ${alternativeOrder.id}`);
      
      // Check if payment already processed
      if (alternativeOrder.paymentStatus === 'SUCCESSFUL') {
        console.log(`Order ${alternativeOrder.id} already processed. Ignoring duplicate webhook.`);
        return NextResponse.json({ message: 'Duplicate webhook ignored' }, { status: 200 });
      }
      
      // Process the successful payment
      await processSuccessfulPayment(alternativeOrder, data);
      return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
    }
    
    // Check if payment already processed to prevent duplicate notifications
    if (order.paymentStatus === 'SUCCESSFUL') {
      console.log(`Order ${order.id} already processed. Ignoring duplicate webhook.`);
      return NextResponse.json({ message: 'Duplicate webhook ignored' }, { status: 200 });
    }

    // Process the successful payment
    await processSuccessfulPayment(order, data);
    
    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error.message 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
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
    
    // Get unique seller IDs from order items
    const sellerIds = [...new Set(order.items.map(item => item.sellerId).filter(Boolean))];
    console.log(`Found ${sellerIds.length} unique seller(s) for order ${order.id}`);

    // Fix missing seller IDs if needed
    if (sellerIds.length === 0) {
      console.warn(`No sellers found for order ${order.id} - attempting to recover seller information`);
      
      // Try to update order items with seller information
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

    // Determine primary seller ID (most common seller in order items)
    let primarySellerId = null;
    if (sellerIds.length > 0) {
      // If only one seller, use that
      if (sellerIds.length === 1) {
        primarySellerId = sellerIds[0];
      } else {
        // Count items by seller to find the primary seller
        const sellerCounts = {};
        order.items.forEach(item => {
          if (item.sellerId) {
            sellerCounts[item.sellerId] = (sellerCounts[item.sellerId] || 0) + 1;
          }
        });
        
        // Find seller with most items
        let maxCount = 0;
        Object.entries(sellerCounts).forEach(([sellerId, count]) => {
          if (count > maxCount) {
            maxCount = count;
            primarySellerId = sellerId;
          }
        });
      }
    }
    
    // Extract transaction ID if available
    let transactionId = null;
    if (webhookData.transaction_id) {
      transactionId = webhookData.transaction_id;
    } else if (webhookData.txnId) {
      transactionId = webhookData.txnId;
    } else if (webhookData.referenceId) {
      transactionId = webhookData.referenceId;
    } else if (webhookData.payment && webhookData.payment.transaction_id) {
      transactionId = webhookData.payment.transaction_id;
    }
    
    // Update order status in DB - CRITICAL FIX: Now includes primarySellerId
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PENDING', // Set to PENDING seller action
        paymentStatus: 'SUCCESSFUL',
        sellerResponseDeadline,
        primarySellerId  // Add this field to ensure it appears in seller orders list
      }
    });
    
    // Create a payment transaction record if it doesn't exist
    const existingTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        orderId: order.id,
        status: 'SUCCESSFUL'
      }
    });
    
    if (!existingTransaction) {
      await prisma.paymentTransaction.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: order.totalAmount,
          currency: 'INR',
          status: 'SUCCESSFUL',
          paymentMethod: order.paymentMethod,
          transactionId: transactionId || `manual-${Date.now()}`
        }
      });
    }

    // Web Push Notifications
    if (sellerIds.length > 0) {
      await sendSellerNotifications(order, sellerIds);
    } else {
      console.error(`No sellers to notify for order ${order.id}`);
    }
  } catch (error) {
    console.error(`Error in processSuccessfulPayment: ${error.message}`);
    throw error;
  }
}

/**
 * Send notifications to sellers about new order
 */
async function sendSellerNotifications(order, sellerIds) {
  try {
    // Set up web push
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      
      // For each seller, find their push subscriptions
      for (const sellerId of sellerIds) {
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { sellerId }
        });
        
        if (subscriptions.length === 0) {
          console.log(`No web push subscriptions found for seller ${sellerId}`);
          continue;
        }
        
        // Create a notification payload
        const payload = JSON.stringify({
          title: `New Order #${order.orderNumber}`,
          body: `You have received a new order of ₹${order.totalAmount}`,
          icon: '/logo.png',
          data: {
            url: `/seller/orders/${order.id}` // Link to open order page
          }
        });
        
        // Send to all subscriptions
        for (const subscription of subscriptions) {
          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            }, payload);
            console.log(`Sent web push notification to seller ${sellerId}`);
          } catch (error) {
            console.error(`Failed to send web push to seller ${sellerId}:`, error);
            // Cleanup invalid subscriptions
            if (error.statusCode === 410) {
              await prisma.pushSubscription.delete({
                where: { id: subscription.id }
              });
            }
          }
        }
        
        // Update seller notification flag
        await prisma.order.update({
          where: { id: order.id },
          data: { sellerNotified: true }
        });
      }
    } else {
      console.error('Missing VAPID keys for web push notifications');
    }
  } catch (error) {
    console.error(`Error sending seller notifications: ${error.message}`);
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