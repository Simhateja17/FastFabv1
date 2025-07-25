import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// Remove webpush import as we're not sending seller notifications anymore
// import webpush from 'web-push';
import { sendAdminOrderPendingSeller } from '@/app/utils/notificationService';

// Initialize Prisma client
const prisma = new PrismaClient();

// Remove the SELLER_RESPONSE_TIMEOUT constant as we no longer need it

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
    let orderId = null;
    
    // Check if this is a refund webhook
    if (data.type === "REFUND_STATUS_WEBHOOK" && data.data?.refund) {
      // Extract order ID from refund webhook structure
      orderId = data.data.refund.order_id;
      console.log(`Extracted Order ID from refund webhook: ${orderId}`);
    } else {
      // For regular payment webhooks, try standard paths
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
      orderId = extractValue(data, orderIdKeys);
    }

    // --- Flexible Transaction ID Extraction (for fallback lookup) ---
    console.log('Attempting to extract Transaction ID (for potential fallback lookup)...');
    let transactionId = null;
    
    // Check if this is a refund webhook
    if (data.type === "REFUND_STATUS_WEBHOOK" && data.data?.refund) {
      // Extract transaction ID from refund webhook structure
      transactionId = data.data.refund.refund_id || data.data.refund.cf_refund_id;
      console.log(`Extracted Transaction ID from refund webhook: ${transactionId}`);
    } else {
      // For regular payment webhooks, try standard paths
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
      transactionId = extractValue(data, transactionIdKeys);
    }

    // Determine what type of webhook this is and process accordingly
    if (data.type === "REFUND_STATUS_WEBHOOK" && data.data?.refund) {
      // This is a refund webhook
      const refundData = data.data.refund;
      const refundId = refundData.refund_id;
      const refundStatus = refundData.refund_status;
      
      console.log(`Processing refund webhook for refund ID: ${refundId}, Status: ${refundStatus}`);
      
      try {
        // Find the payment transaction associated with this refund
        const transaction = await prisma.paymentTransaction.findFirst({
          where: {
            OR: [
              { transactionId: refundId },
              { 
                gatewayResponse: {
                  path: ['refundResponse', 'refund_id'],
                  equals: refundId
                }
              },
              {
                gatewayResponse: {
                  path: ['cashfreeRefundId'],
                  equals: refundData.cf_refund_id.toString()
                }
              }
            ]
          }
        });
        
        if (transaction) {
          // Update the gateway response with the latest status
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              gatewayResponse: {
                ...(transaction.gatewayResponse || {}),
                refundStatus,
                statusDescription: refundData.status_description,
                processedAt: refundData.processed_at,
                refundWebhookData: data
              }
            }
          });
          
          console.log(`Updated transaction ${transaction.id} with refund status: ${refundStatus}`);
          
          // If the refund is successful and this is linked to a return request, update the return status
          if (refundStatus === "SUCCESS" && transaction.gatewayResponse?.returnRequestId) {
            const returnRequestId = transaction.gatewayResponse.returnRequestId;
            
            // Update the return request status to COMPLETED
            await prisma.returnRequest.update({
              where: { id: returnRequestId },
              data: {
                status: "COMPLETED"
              }
            });
            
            console.log(`Updated return request ${returnRequestId} status to COMPLETED`);
          }
        } else {
          console.log(`No transaction found for refund ID: ${refundId}`);
        }
      } catch (error) {
        console.error(`Error processing refund webhook: ${error.message}`);
      }
      
      // Acknowledge receipt
      return NextResponse.json({ 
        message: 'Refund webhook processed successfully', 
        success: true 
      }, { status: 200 });
    }

    // Proceed with regular payment webhook processing
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
      include: { items: true, user: true, address: true }
    });

    if (!order) {
       console.log(`Order not found using orderNumber ${orderId}. Trying alternative IDs...`);
       // Corrected fallback: Only search by internal ID if the Cashfree ID format matches UUID.
       // Removed invalid fields: externalOrderId, referenceId.
       // Also removed transactionId lookup for now as it wasn't extracted successfully.
       let alternativeIdLookups = [];
       // Basic check if the orderId looks like a UUID, if so, try searching by internal id
       if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderId)) {
          alternativeIdLookups.push({ id: orderId });
       }

       // Only proceed if there are valid alternative lookups
       if (alternativeIdLookups.length > 0) {
         order = await prisma.order.findFirst({
           where: { OR: alternativeIdLookups },
           // Include the same fields as the findUnique call
           include: { items: true, user: true, address: true, transactions: true, primarySeller: true }
         });
       } else {
         console.log('No valid alternative lookup fields identified for the given Order ID format.');
       }
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
 * Process a successful payment: Update DB, calculate primary seller, notify admin.
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

  // --- Update Order in Database ---
  console.log(`Updating order ${order.id} status to PENDING and payment to SUCCESSFUL.`);
  await prisma.order.update({
      where: { id: order.id },
      data: {
          status: 'PENDING', // Order is pending admin review
          paymentStatus: 'SUCCESSFUL',
          primarySellerId: primarySellerId, // Set the calculated primary seller
          adminNotified: false, // Initially not notified
          adminProcessed: false, // Not processed by admin yet
          // Removing sellerNotified and sellerResponseDeadline
      }
  });

  // --- Create Payment Transaction Record ---
  // Ensure transactionId is a string or null
  const finalTransactionId = typeof transactionId === 'string' ? transactionId : `webhook-${Date.now()}`;
  console.log(`Creating/Verifying payment transaction record for order ${order.id} with transaction ID ${finalTransactionId}`);
  
  try {
    // Step 1: First try to find an existing transaction
    const existingTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        orderId: order.id,
        status: 'SUCCESSFUL'
      }
    });

    // Step 2: Either update existing or create new
    if (existingTransaction) {
      console.log(`Found existing transaction record with ID ${existingTransaction.id}, updating...`);
      await prisma.paymentTransaction.update({
        where: { id: existingTransaction.id }, // Using the unique ID field
        data: {
          gatewayResponse: webhookData,
          updatedAt: new Date()
        }
      });
    } else {
      console.log(`No existing transaction record found, creating new...`);
      // Generate a unique ID for the new transaction record - using same format as other IDs
      const newTransactionId = order.id.includes('-') ? 
        `pt-${order.id}` : // Using order ID as base for transaction ID with pt- prefix
        `pt-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`; // Fallback random ID
      
      await prisma.paymentTransaction.create({
        data: {
          id: newTransactionId,
          userId: order.userId,
          orderId: order.id,
          amount: order.totalAmount,
          currency: 'INR',
          status: 'SUCCESSFUL',
          paymentMethod: order.paymentMethod,
          transactionId: finalTransactionId,
          gatewayResponse: webhookData,
          updatedAt: new Date()
        }
      });
    }
    console.log(`Successfully processed payment transaction record for order ${order.id}`);
  } catch (error) {
    console.error(`Error processing payment transaction record: ${error.message}`);
    // Continue execution to still attempt admin notification even if transaction record fails
  }

  // --- Send Admin Notification ---
  await sendAdminNotification(order, sellerIds);

  console.log(`Successfully processed payment and notified admin for order ${order.id}.`);
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
 * Send notification to admin about new order.
 * @param {Object} order - The order object (with includes)
 * @param {Array<string>} sellerIds - Array of unique seller IDs for reference
 */
async function sendAdminNotification(order, sellerIds) {
  console.log('Sending admin notification for new order...');
  
  // Check if we have an admin notification phone number
  const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE;
  if (!adminPhone) {
    console.error('Missing ADMIN_NOTIFICATION_PHONE in environment variables. Cannot send admin notification.');
    return;
  }

  try {
    // Prepare seller information if available
    let primarySeller = null;
    if (order.primarySellerId) {
      primarySeller = await prisma.seller.findUnique({
        where: { id: order.primarySellerId },
        select: { 
          id: true,
          shopName: true, 
          phone: true,
          address: true,
          city: true,
          state: true,
          pincode: true
        }
      });
    }

    // Get formatted shipping address
    const shippingAddress = order.address ? formatAddress(order.address) : 'Address not available';
    
    // Get seller information with fallbacks for required template parameters
    const sellerName = primarySeller?.shopName || 'Not assigned';
    const sellerPhone = primarySeller?.phone || 'Not available';
    const sellerAddress = primarySeller ? formatAddress({
      line1: primarySeller.address,
      city: primarySeller.city,
      state: primarySeller.state,
      pincode: primarySeller.pincode
    }) : 'Address not available';

    // Attempt to get the primary product image if available
    let primaryProduct = null;
    let productImageUrl = null;
    
    try {
      if (order.items && order.items.length > 0) {
        // Get the first item's product details
        const firstItem = order.items[0];
        
        // Check if we already have the product details
        if (firstItem.product && firstItem.product.images && firstItem.product.images.length > 0) {
          productImageUrl = firstItem.product.images[0];
        } else {
          // If not, try to fetch the product details
          primaryProduct = await prisma.product.findUnique({
            where: { id: firstItem.productId },
            select: { images: true }
          });
          
          if (primaryProduct && primaryProduct.images && primaryProduct.images.length > 0) {
            productImageUrl = primaryProduct.images[0];
          }
        }
      }
      
      console.log(`Product image URL for notification: ${productImageUrl || 'None available'}`);
    } catch (imageError) {
      console.error(`Error fetching product image: ${imageError.message}`);
      // Continue without image if there's an error
    }
    
    // Send notification to admin - all 8 parameters are required by the template
    await sendAdminOrderPendingSeller(adminPhone, {
      orderId: order.orderNumber,
      amount: order.totalAmount,
      customerName: order.user?.name || 'Customer',
      customerPhone: order.user?.phone || 'N/A',
      shippingAddress: shippingAddress,
      sellerName: sellerName,
      sellerPhone: sellerPhone,
      sellerAddress: sellerAddress,
      productImageUrl: productImageUrl  // Pass the image URL to the notification service
    });

    // Update the order to mark admin as notified
    await prisma.order.update({
      where: { id: order.id },
      data: { adminNotified: true }
    });

    console.log(`Successfully notified admin about order ${order.id}`);
  } catch (error) {
    console.error(`Error sending admin notification: ${error.message}`);
    console.error(error.stack); // Log the full error stack for debugging
    
    // If possible, try a simplified notification as fallback
    try {
      if (adminPhone) {
        await sendAdminOrderPendingSeller(adminPhone, {
          orderId: order.orderNumber || 'Unknown',
          amount: order.totalAmount || 0,
          customerName: 'Customer',
          customerPhone: 'N/A',
          shippingAddress: 'Not available',
          sellerName: 'Not assigned',
          sellerPhone: 'Not available',
          sellerAddress: 'Not available'
        });
        console.log(`Sent simplified fallback notification for order ${order.id}`);
      }
    } catch (fallbackError) {
      console.error(`Even fallback notification failed: ${fallbackError.message}`);
    }
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

// When loading this file, log that we're running the admin-focused version
console.log('Running admin-focused order notification system (no seller notifications)'); 