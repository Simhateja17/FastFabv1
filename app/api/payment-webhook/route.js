import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push'; // Import web-push
// Remove Gupshup notification imports as we replace them
// import { 
//   sendSellerOrderWithImage,
//   sendAdminOrderPendingSeller 
// } from '@/app/utils/notificationService';
// Trigger redeploy - attempt 2
// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const SELLER_RESPONSE_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

/**
 * Validates Cashfree webhook signature (Placeholder - Implement properly for production)
 */
const validateWebhookSignature = (headers, payload, secret) => {
  console.warn("Webhook signature validation is currently disabled for development.");
  return true; // IMPORTANT: Replace with actual validation in production
};

/**
 * Attempts to extract a value from various potential paths within the webhook data.
 */
const extractValue = (data, keys) => {
  for (const key of keys) {
    const parts = key.split('.');
    let value = data;
    try {
      for (const part of parts) {
        if (value === null || typeof value !== 'object' || !(part in value)) {
          value = undefined; // Path doesn't exist
          break;
        }
        value = value[part];
      }
      if (value !== undefined && value !== null) {
        console.log(`Extracted value using key '${key}':`, value);
        return value;
      }
    } catch (e) {
      // Ignore errors during extraction path traversal
    }
  }
  console.log(`Could not extract value using keys: [${keys.join(', ')}]`);
  return undefined;
};

/**
 * Handler for Cashfree payment webhook
 */
export async function POST(request) {
  let orderIdToProcess = null; // Keep track of the order ID being processed
  try {
    console.log('Received payment webhook request from Cashfree');

    const payload = await request.text();
    console.log('Webhook raw payload received:', payload);

    let data;
    try {
      data = JSON.parse(payload);
    } catch (error) {
      console.error('Invalid JSON payload:', error.message);
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    // Log the parsed data structure
    console.log('Webhook parsed data structure:', JSON.stringify(data, null, 2));

    // Validate webhook signature
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!validateWebhookSignature(request.headers, payload, secret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 401 });
    }

    // --- Flexible Order ID Extraction ---
    console.log('Attempting to extract Order ID...');
    const orderIdKeys = [
      'order.order_id',
      'data.order.order_id',
      'order_id',
      'orderId',
      'cf_order_id',
      // Less common but possible
      'merchantOrderId',
      'merchant_order_id',
    ];
    const orderId = extractValue(data, orderIdKeys);

    // --- Flexible Transaction ID Extraction (for fallback lookup) ---
    console.log('Attempting to extract Transaction ID (for potential fallback lookup)...');
    const transactionIdKeys = [
        'transaction.transaction_id',
        'data.transaction.transaction_id',
        'transaction_id',
        'cf_payment_id', // Often used as Tx ID
        'payment.cf_payment_id',
        'txId',
        'txnId',
        'referenceId',
        'cf_transaction_id',
        'paymentId', // Sometimes used
    ];
    const transactionId = extractValue(data, transactionIdKeys);


    if (!orderId) {
      console.error('Could not extract a primary Order ID from webhook payload.');
      // Fallback logic remains important here if no order ID is found,
      // but the "Missing required fields" error suggests a more fundamental issue
      // if it's happening *before* this point.
      // Acknowledge receipt, maybe try finding recent pending order later if needed.
      return NextResponse.json({
        message: 'Webhook received, but primary Order ID could not be extracted from expected fields.',
        success: true // Acknowledge receipt to Cashfree
      }, { status: 200 });
    }

    console.log(`Successfully extracted Order ID: ${orderId}`);
    orderIdToProcess = orderId; // Set the order ID we are trying to process

    // --- Flexible Payment Status Extraction ---
    console.log('Attempting to extract Payment Status...');
    const statusKeys = [
      'payment.payment_status',
      'data.payment.payment_status', // Nested structure
      'transaction.txStatus', // Common alternative
      'data.transaction.txStatus',
      'payment_status',
      'txStatus',
      'status', // Generic status field
      'data.status' // Nested generic status
    ];
    const paymentStatus = extractValue(data, statusKeys);

    if (paymentStatus === undefined) {
        console.error(`Could not extract Payment Status using keys: [${statusKeys.join(', ')}]`);
        // Acknowledge receipt but log the issue. Cannot confirm success without status.
        return NextResponse.json({ message: 'Webhook received, but payment status could not be extracted.', success: true }, { status: 200 });
    }

    console.log(`Successfully extracted Payment Status: ${paymentStatus}`);

    // --- Check if Payment is Successful (Relaxed Check) ---
    const successKeywords = [
      'SUCCESS', 'PAID', 'TXN_SUCCESS', 'SUCCESSFUL', 'COMPLETED',
      'OK', 'CAPTURED', 'APPROVED', 'AUTHORIZED', 'PAYMENT_SUCCESSFUL'
      // Add any other success variants observed from Cashfree
    ];
    const isSuccessful = successKeywords.some(keyword =>
        String(paymentStatus).toUpperCase().includes(keyword)
    );

    if (!isSuccessful) {
      console.log(`Payment status '${paymentStatus}' for Order ID ${orderId} is not considered successful. No action taken.`);
      // Acknowledge receipt even for non-successful payments
      return NextResponse.json({ message: `Payment status '${paymentStatus}' not successful.` }, { status: 200 });
    }

    console.log(`Payment for Order ID ${orderId} is successful.`);

    // --- Find Order in Database (Flexible Lookup) ---
    console.log(`Attempting to find order in database using Order ID: ${orderId}`);
    let order = await prisma.order.findUnique({
      where: { orderNumber: orderId },
      include: { items: true, user: true, shippingAddress: true }
    });

    if (!order) {
       console.log(`Order not found using orderNumber ${orderId}. Trying alternative IDs...`);
       const alternativeIdLookups = [
         { externalOrderId: orderId },
         { referenceId: orderId },
         // Attempt lookup by transactionId if available and different from orderId
         ...(transactionId && transactionId !== orderId ? [{ transactions: { some: { transactionId: transactionId } } }] : []),
         // Final attempt: maybe the passed orderId is the internal UUID? Unlikely but possible.
         { id: orderId }
       ];

       order = await prisma.order.findFirst({
         where: { OR: alternativeIdLookups },
         include: { items: true, user: true, shippingAddress: true }
       });
    }

    if (!order) {
      console.error(`FATAL: Order corresponding to identifier '${orderId}' (or transactionId '${transactionId}') not found in database after all lookup attempts.`);
      // Acknowledge webhook, but log critical failure
      return NextResponse.json({ message: 'Order not found locally, webhook acknowledged but cannot process.' }, { status: 200 });
    }

    console.log(`Successfully found order ${order.id} (OrderNumber: ${order.orderNumber}) in database.`);
    orderIdToProcess = order.id; // Now using the internal DB ID for safety

    // --- Idempotency Check ---
    if (order.paymentStatus === 'SUCCESSFUL') {
      console.log(`Order ${order.id} has already been marked as SUCCESSFUL. Ignoring duplicate webhook.`);
      return NextResponse.json({ message: 'Duplicate webhook ignored' }, { status: 200 });
    }

    // --- Process Successful Payment ---
    await processSuccessfulPayment(order, data, transactionId); // Pass transactionId too

    return NextResponse.json({ message: 'Webhook processed successfully', orderId: order.id }, { status: 200 });

  } catch (error) {
    console.error(`Error processing payment webhook for Order ID ${orderIdToProcess || 'UNKNOWN'}:`, error);
    // Log specific error message if available
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
        message: 'Internal server error processing webhook',
        error: error.message // Include error message in response
    }, { status: 500 });
  } finally {
    // Ensure Prisma client disconnects
    try {
        await prisma.$disconnect();
        console.log("Prisma client disconnected.");
    } catch (disconnectError) {
        console.error("Error disconnecting Prisma client:", disconnectError);
    }
  }
}

/**
 * Process a successful payment: Update DB, calculate primary seller, send notifications.
 * @param {Object} order - Order object from database (with includes)
 * @param {Object} webhookData - Parsed webhook data from Cashfree
 * @param {string | null} transactionId - Extracted transaction ID
 */
async function processSuccessfulPayment(order, webhookData, transactionId) {
  console.log(`Processing successful payment for order ${order.id} (OrderNumber: ${order.orderNumber})`);

  // Recalculate seller IDs, attempting recovery if needed
  let sellerIds = [...new Set(order.items.map(item => item.sellerId).filter(Boolean))];
  if (sellerIds.length === 0 && order.items.length > 0) {
      console.warn(`No Seller IDs found directly on items for order ${order.id}. Attempting recovery...`);
      const recoveredIds = await recoverSellerIdsForOrderItems(order.items);
      sellerIds = [...new Set(recoveredIds)]; // Update sellerIds with recovered ones
      console.log(`Recovered seller IDs for order ${order.id}: [${sellerIds.join(', ')}]`);
  } else {
      console.log(`Found Seller IDs on items for order ${order.id}: [${sellerIds.join(', ')}]`);
  }

  // Determine primary seller ID
  const primarySellerId = determinePrimarySellerId(order.items, sellerIds);
  if (primarySellerId) {
      console.log(`Determined primary seller for order ${order.id} is ${primarySellerId}`);
  } else {
      console.warn(`Could not determine primary seller for order ${order.id}.`);
  }

  // Calculate seller response deadline
  const sellerResponseDeadline = new Date(Date.now() + SELLER_RESPONSE_TIMEOUT);

  // --- Update Order in Database ---
  console.log(`Updating order ${order.id} status to PENDING (Seller Action) and payment to SUCCESSFUL.`);
  await prisma.order.update({
      where: { id: order.id },
      data: {
          status: 'PENDING', // Requires seller action
          paymentStatus: 'SUCCESSFUL',
          sellerResponseDeadline,
          primarySellerId: primarySellerId, // Set the calculated primary seller
          // Optionally store raw webhook for audit? (Requires schema change)
          // webhookPayload: JSON.stringify(webhookData)
      }
  });

  // --- Create Payment Transaction Record ---
  // Ensure transactionId is a string or null
  const finalTransactionId = typeof transactionId === 'string' ? transactionId : `webhook-${Date.now()}`;
  console.log(`Creating/Verifying payment transaction record for order ${order.id} with transaction ID ${finalTransactionId}`);
  await prisma.paymentTransaction.upsert({
      where: {
          // Attempt to find based on orderId and SUCCESSFUL status first
          // This simple check might not be enough if multiple SUCCESS webhooks arrive
          // A unique constraint on (orderId, transactionId, status) might be better
          orderId_status: { // Use a hypothetical unique constraint name or adjust as needed
            orderId: order.id,
            status: 'SUCCESSFUL' // Check if a successful transaction already exists
          }
          // If using transactionId as part of uniqueness:
          // transactionId: finalTransactionId
      },
      update: {
          // If found, maybe update timestamp or gateway response
          gatewayResponse: webhookData,
          updatedAt: new Date()
      },
      create: {
          userId: order.userId,
          orderId: order.id,
          amount: order.totalAmount,
          currency: 'INR',
          status: 'SUCCESSFUL',
          paymentMethod: order.paymentMethod,
          transactionId: finalTransactionId, // Use extracted or generated ID
          gatewayResponse: webhookData // Store raw webhook data for reference
      }
  });

  // --- Send Seller Notifications ---
  if (sellerIds.length > 0) {
      console.log(`Sending notifications to sellers: [${sellerIds.join(', ')}] for order ${order.id}`);
      await sendSellerNotifications(order, sellerIds);
  } else {
      console.error(`CRITICAL: No sellers identified for order ${order.id} after recovery attempts. Cannot send notifications.`);
      // Potentially send an alert to admin here
  }

  console.log(`Successfully processed payment and initiated notifications for order ${order.id}.`);
}


/**
 * Tries to find seller IDs for order items where sellerId is missing.
 * @param {Array} orderItems - Array of order items from the order
 * @returns {Array<string>} Array of recovered seller IDs
 */
async function recoverSellerIdsForOrderItems(orderItems) {
    const recoveredSellerIds = [];
    const itemsToUpdate = [];

    for (const item of orderItems) {
        if (!item.sellerId && item.productId) {
            try {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { sellerId: true }
                });

                if (product && product.sellerId) {
                    console.log(`Recovered seller ${product.sellerId} for product ${item.productId} in order item ${item.id}`);
                    recoveredSellerIds.push(product.sellerId);
                    // Add to list for batch update
                    itemsToUpdate.push({
                        where: { id: item.id },
                        data: { sellerId: product.sellerId }
                    });
                    // Update item in memory for primary seller calculation
                    item.sellerId = product.sellerId;
                } else {
                     console.warn(`Could not find product or seller for productId ${item.productId} in order item ${item.id}`);
                }
            } catch (error) {
                console.error(`Error recovering seller for productId ${item.productId}: ${error.message}`);
            }
        } else if (item.sellerId) {
            // Include existing valid seller IDs
            recoveredSellerIds.push(item.sellerId);
        }
    }

    // Batch update recovered seller IDs if any
    if (itemsToUpdate.length > 0) {
        console.log(`Attempting to batch update sellerId for ${itemsToUpdate.length} order items.`);
        try {
            // Prisma doesn't have a direct batch update based on different conditions/data,
            // so we run updates in a transaction.
            await prisma.$transaction(
              itemsToUpdate.map(update => prisma.orderItem.update(update))
            );
            console.log(`Successfully updated sellerId for ${itemsToUpdate.length} items.`);
        } catch (txError) {
            console.error(`Failed to batch update sellerIds in transaction: ${txError.message}`);
            // Continue processing, but be aware data might be inconsistent
        }
    }

    return [...new Set(recoveredSellerIds)]; // Return unique IDs
}

/**
 * Determines the primary seller ID based on item counts.
 * @param {Array} orderItems - Array of order items (potentially updated with recovered sellerIds)
 * @param {Array<string>} sellerIds - Array of unique seller IDs involved in the order
 * @returns {string | null} The ID of the primary seller, or null if none determined.
 */
function determinePrimarySellerId(orderItems, sellerIds) {
    if (!sellerIds || sellerIds.length === 0) {
        return null;
    }
    if (sellerIds.length === 1) {
        return sellerIds[0];
    }

    const sellerCounts = {};
    orderItems.forEach(item => {
        if (item.sellerId) {
            sellerCounts[item.sellerId] = (sellerCounts[item.sellerId] || 0) + 1;
        }
    });

    let primarySellerId = null;
    let maxCount = 0;
    Object.entries(sellerCounts).forEach(([sellerId, count]) => {
        if (count > maxCount) {
            maxCount = count;
            primarySellerId = sellerId;
        }
        // Optional: Handle ties? Currently picks the last one found in case of a tie.
    });

    return primarySellerId;
}


/**
 * Send notifications to sellers about new order using Web Push.
 * @param {Object} order - The order object (with includes)
 * @param {Array<string>} sellerIds - Array of unique seller IDs to notify
 */
async function sendSellerNotifications(order, sellerIds) {
  console.log('Attempting to send Web Push notifications...');
  // Set up web push VAPID keys
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    try {
        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT,
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, // Use the public key meant for frontend
            process.env.VAPID_PRIVATE_KEY
        );
        console.log('Web Push VAPID details configured.');
    } catch(err) {
        console.error("Error setting VAPID details:", err);
        return; // Cannot proceed without VAPID setup
    }
  } else {
      console.error('Missing VAPID keys in environment variables. Cannot send web push notifications.');
      return; // Cannot proceed
  }

  // Prepare notification payload (common for all sellers for this order)
  const notificationPayload = JSON.stringify({
      title: `📦 New Order #${order.orderNumber}`,
      body: `Order of ₹${order.totalAmount.toFixed(2)} received. Please confirm ASAP.`,
      icon: '/logo_transparent.png', // Ensure this icon exists in your public folder
      data: {
          url: `/seller/orders/${order.id}` // Deep link to the order details page
      },
      tag: `order-${order.id}` // Allows replacing notifications for the same order
  });

  let overallSuccess = false;

  // Iterate through each seller ID
  for (const sellerId of sellerIds) {
      try {
          const subscriptions = await prisma.pushSubscription.findMany({
              where: { sellerId }
          });

          if (subscriptions.length === 0) {
              console.log(`No active web push subscriptions found for seller ${sellerId}.`);
              continue; // Skip to next seller
          }

          console.log(`Found ${subscriptions.length} subscriptions for seller ${sellerId}. Attempting to send...`);
          let sellerNotified = false;

          // Send to all subscriptions for this seller
          const sendPromises = subscriptions.map(sub => {
              return webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth }
              }, notificationPayload)
              .then(() => {
                  console.log(`Successfully sent web push to endpoint for seller ${sellerId}`);
                  sellerNotified = true; // Mark success if at least one sends
                  return { success: true, id: sub.id };
              })
              .catch(error => {
                  console.error(`Failed to send web push notification to endpoint for seller ${sellerId}. Status: ${error.statusCode}. Body: ${error.body}`);
                  // Handle expired/invalid subscriptions
                  if (error.statusCode === 410 || error.statusCode === 404) {
                      console.log(`Subscription ${sub.id} for seller ${sellerId} is invalid. Deleting.`);
                      return prisma.pushSubscription.delete({ where: { id: sub.id } }).then(() => ({ deleted: true, id: sub.id }));
                  }
                  return { success: false, id: sub.id };
              });
          });

          // Wait for all attempts for this seller
          await Promise.allSettled(sendPromises);

          if (sellerNotified) {
              overallSuccess = true; // Mark overall success if any seller was notified
              console.log(`Successfully notified seller ${sellerId} via Web Push.`);
              // Update the order to indicate this seller was notified (optional, might need schema change)
              // await prisma.order.update(...)
          } else {
               console.warn(`Failed to send any Web Push notifications to seller ${sellerId}.`);
          }

      } catch (error) {
          console.error(`Error processing notifications for seller ${sellerId}: ${error.message}`);
      }
  } // End loop through sellerIds

  // Update the main sellerNotified flag on the order if any seller was successfully notified
  if (overallSuccess) {
      try {
          await prisma.order.update({
              where: { id: order.id },
              data: { sellerNotified: true } // Mark that at least one seller notification attempt was successful
          });
          console.log(`Marked order ${order.id} as sellerNotified=true.`);
      } catch (updateError) {
          console.error(`Failed to update sellerNotified flag for order ${order.id}: ${updateError.message}`);
      }
  } else {
     console.error(`Failed to send Web Push notifications to any seller for order ${order.id}.`);
     // Consider adding alternative notification methods (Email, SMS, WhatsApp) here as a fallback if needed.
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