/**
 * Order Timeout Checker Script
 * 
 * This script checks for orders that have timed out waiting for seller response
 * and processes them (cancels the order, initiates refund, sends notifications)
 * 
 * How to run:
 * - Manually: node scripts/check-order-timeouts.js
 * - Via cron: Set up a cron job to run this script every minute
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Gupshup API configuration
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const GUPSHUP_SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
const GUPSHUP_SRC_NAME = process.env.GUPSHUP_SRC_NAME;
const GUPSHUP_API_URL = process.env.GUPSHUP_API_URL;
const TEMPLATE_CUSTOMER_CANCELLED = process.env.GUPSHUP_TEMPLATE_CUSTOMER_ORDER_CANCELLED;
const TEMPLATE_ADMIN_ORDER = process.env.GUPSHUP_TEMPLATE_ADMIN_ORDER_PENDING;
const ADMIN_PHONE = process.env.ADMIN_NOTIFICATION_PHONE;

// Cashfree API configuration
const CASHFREE_API_KEY = process.env.CASHFREE_API_KEY;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_URL = process.env.CASHFREE_API_URL || 'https://sandbox.cashfree.com/pg';

/**
 * Send template notification via Gupshup
 */
async function sendTemplateNotification(templateName, phoneNumber, params) {
  try {
    if (!templateName || !phoneNumber || !params) {
      console.error('Missing required parameters for notification');
      return { success: false, error: 'Missing parameters' };
    }

    // Format destination phone number (remove + if present)
    const destination = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

    // Check if Gupshup credentials are present
    if (!GUPSHUP_API_KEY || !GUPSHUP_SOURCE_NUMBER || !GUPSHUP_API_URL) {
      console.log('Gupshup credentials missing, cannot send notification');
      return { success: false, error: 'Gupshup credentials missing' };
    }

    // Prepare the request body
    const requestBody = new URLSearchParams();
    requestBody.append('source', GUPSHUP_SOURCE_NUMBER);
    if (GUPSHUP_SRC_NAME) {
      requestBody.append('source.name', GUPSHUP_SRC_NAME);
    }
    requestBody.append('destination', destination);
    
    // Convert params array to include only values for template parameters
    const templateParams = Object.values(params);
    
    const templateData = JSON.stringify({
      id: templateName,
      params: templateParams
    });
    
    requestBody.append('template', templateData);

    console.log('Sending template notification:', {
      template: templateName,
      destination,
      params: templateParams
    });

    // Call the Gupshup API
    const response = await axios.post(
      GUPSHUP_API_URL,
      requestBody,
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Apikey': GUPSHUP_API_KEY
        }
      }
    );

    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        message: 'Notification sent successfully',
        data: response.data
      };
    } else {
      console.error('Gupshup API returned non-success status:', response.status);
      return {
        success: false,
        message: 'Failed to send notification',
        error: response.data || 'Unknown API error'
      };
    }
  } catch (error) {
    console.error('Error sending template notification:', error.message);
    return {
      success: false,
      message: 'Error sending notification',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Initialize a refund with Cashfree
 */
async function initiateRefund(order) {
  try {
    if (!order || !order.orderNumber) {
      console.error('Invalid order for refund');
      return { success: false, error: 'Invalid order' };
    }
    
    const refundPayload = {
      refund_amount: order.totalAmount,
      refund_id: `refund_${Date.now()}_${order.id.substring(0, 8)}`,
      refund_note: 'Refund due to seller response timeout'
    };
    
    console.log(`Initiating refund for order ${order.orderNumber}`);
    
    const response = await axios.post(
      `${CASHFREE_API_URL}/orders/${order.orderNumber}/refunds`,
      refundPayload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': CASHFREE_API_KEY,
          'x-client-secret': CASHFREE_SECRET_KEY
        }
      }
    );
    
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        message: 'Refund initiated successfully',
        data: response.data
      };
    } else {
      console.error('Cashfree API returned non-success status:', response.status);
      return {
        success: false,
        message: 'Failed to initiate refund',
        error: response.data || 'Unknown API error'
      };
    }
  } catch (error) {
    console.error('Error initiating refund:', error.message);
    return {
      success: false,
      message: 'Error initiating refund',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Format an address object into a readable string
 */
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

/**
 * Process an order that has timed out
 */
async function processTimedOutOrder(order) {
  try {
    console.log(`Processing timed out order ${order.id}`);
    
    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: order.notes ? `${order.notes}; Cancelled due to seller response timeout` : 'Cancelled due to seller response timeout'
      }
    });
    
    // Initiate refund
    const refundResult = await initiateRefund(order);
    
    if (refundResult.success) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'REFUNDED'
        }
      });
      
      // Create refund record in payment transactions
      await prisma.paymentTransaction.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: order.totalAmount,
          status: 'REFUNDED',
          paymentMethod: order.paymentMethod,
          currency: 'INR',
          transactionId: refundResult.data?.refund_id || `refund_${Date.now()}`
        }
      });
    }
    
    // Notify customer
    if (order.user?.phone) {
      await sendTemplateNotification(
        TEMPLATE_CUSTOMER_CANCELLED,
        order.user.phone,
        {
          customerName: order.user.name || 'Customer',
          orderId: order.orderNumber,
          reason: 'Seller response timeout',
          refundAmount: order.totalAmount
        }
      );
      
      // Update order to mark customer as notified
      await prisma.order.update({
        where: { id: order.id },
        data: {
          customerNotified: true
        }
      });
    }
    
    // Notify admin
    if (ADMIN_PHONE) {
      await sendTemplateNotification(
        TEMPLATE_ADMIN_ORDER,
        ADMIN_PHONE,
        {
          orderId: order.orderNumber,
          amount: order.totalAmount,
          customerName: order.user?.name || 'Customer',
          customerPhone: order.user?.phone || 'N/A',
          shippingAddress: formatAddress(order.shippingAddress),
          status: 'TIMEOUT_CANCELLED'
        }
      );
    }
    
    console.log(`Successfully processed timed out order ${order.id}`);
    return true;
  } catch (error) {
    console.error(`Error processing timed out order ${order.id}:`, error);
    return false;
  }
}

/**
 * Check and process orders that have timed out waiting for seller response
 */
async function checkOrderTimeouts() {
  try {
    console.log('Checking for timed out orders...');
    
    // Find orders that have timed out
    const timedOutOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'SUCCESSFUL',
        sellerResponseDeadline: {
          lt: new Date() // deadline is in the past
        }
      },
      include: {
        user: true,
        shippingAddress: true
      }
    });
    
    console.log(`Found ${timedOutOrders.length} timed out orders`);
    
    // Process each timed out order
    for (const order of timedOutOrders) {
      await processTimedOutOrder(order);
    }
    
    return timedOutOrders.length;
  } catch (error) {
    console.error('Error checking order timeouts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkOrderTimeouts()
  .then(count => {
    console.log(`Processed ${count} timed out orders`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  }); 