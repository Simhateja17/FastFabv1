import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  sendCustomerOrderCancelledRefund,
  sendAdminOrderPendingSeller,
} from '@/app/utils/notificationService';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * GET handler for Gupshup validation requests
 * This allows Gupshup to validate the webhook URL
 */
export async function GET(request) {
  console.log('Received GET request for webhook validation');
  return NextResponse.json({ 
    message: 'Webhook endpoint is active and ready to receive messages',
    status: 'success'
  }, { status: 200 });
}

/**
 * Handler for Gupshup WhatsApp reply webhook
 * This endpoint receives seller responses to order notifications
 */
export async function POST(request) {
  try {
    console.log('Received Gupshup webhook reply');
    
    // Parse the incoming webhook data
    let payload;
    try {
      payload = await request.json();
      console.log('Webhook payload:', JSON.stringify(payload));
    } catch (e) {
      console.error('Error parsing webhook payload:', e);
      return NextResponse.json({
        message: 'Invalid payload format'
      }, { status: 400 });
    }
    
    // Extract the necessary information from the payload
    // This structure will depend on Gupshup's webhook format
    const { 
      app, 
      sender, 
      type, 
      payload: messagePayload 
    } = payload;
    
    // Validate payload has necessary information
    if (!app || !sender || !type || !messagePayload) {
      console.error('Missing required webhook fields');
      return NextResponse.json({
        message: 'Missing required webhook fields'
      }, { status: 400 });
    }
    
    // Extract phone number (remove WhatsApp: prefix if present)
    const phoneNumber = sender.phone.replace('whatsapp:', '');
    
    // Extract button response if it's an interactive message
    if (type === 'interactive' && messagePayload.type === 'button_reply') {
      const buttonId = messagePayload.button_reply.id;
      const buttonText = messagePayload.button_reply.title;
      
      console.log(`Received button reply: ${buttonId} (${buttonText}) from ${phoneNumber}`);
      
      // Extract order ID from button ID (format: action_orderId)
      const orderId = buttonId.split('_')[1];
      
      if (!orderId) {
        console.error('Invalid button ID format, cannot extract order ID');
        return NextResponse.json({
          message: 'Invalid button ID format'
        }, { status: 400 });
      }
      
      // Lookup order by ID
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          user: true,
          shippingAddress: true
        }
      });
      
      if (!order) {
        console.error(`Order ${orderId} not found`);
        return NextResponse.json({
          message: 'Order not found'
        }, { status: 404 });
      }
      
      // Process seller response based on button clicked
      if (buttonId.startsWith('accept_')) {
        // Handle order acceptance
        await handleOrderAccepted(order, phoneNumber);
      } else if (buttonId.startsWith('reject_')) {
        // Handle order rejection
        await handleOrderRejected(order, phoneNumber);
      } else {
        console.warn(`Unknown button action: ${buttonId}`);
      }
      
      return NextResponse.json({
        message: 'Webhook processed successfully'
      }, { status: 200 });
    }
    
    // Handle text messages or other types
    console.log(`Received message of type ${type} from ${phoneNumber}`);
    
    return NextResponse.json({
      message: 'Webhook received, but no action taken'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({
      message: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Handle order acceptance from seller
 */
async function handleOrderAccepted(order, sellerPhone) {
  try {
    console.log(`Processing order acceptance for order ${order.id} from ${sellerPhone}`);
    
    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        sellerNotified: true
      }
    });
    
    // Get the admin phone from environment variables
    const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE;
    
    // Notify the admin about the seller's acceptance
    if (adminPhone) {
      await sendAdminOrderPendingSeller(adminPhone, {
        orderId: order.orderNumber,
        amount: order.totalAmount,
        customerName: order.user?.name || 'Customer',
        customerPhone: order.user?.phone || 'N/A',
        shippingAddress: formatAddress(order.shippingAddress)
      });
    }
    
    console.log(`Order ${order.id} confirmed by seller ${sellerPhone}`);
    
    return true;
  } catch (error) {
    console.error('Error handling order acceptance:', error);
    throw error;
  }
}

/**
 * Handle order rejection from seller
 */
async function handleOrderRejected(order, sellerPhone) {
  try {
    console.log(`Processing order rejection for order ${order.id} from ${sellerPhone}`);
    
    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        paymentStatus: 'REFUNDED',
        notes: order.notes ? `${order.notes}; Rejected by seller` : 'Rejected by seller',
        sellerNotified: true
      }
    });
    
    // Notify the customer about the cancellation and refund
    if (order.user?.phone) {
      await sendCustomerOrderCancelledRefund(order.user.phone, {
        customerName: order.user.name || 'Customer',
        orderId: order.orderNumber,
        reason: 'Rejected by seller',
        refundAmount: order.totalAmount
      });
    }
    
    // Get the admin phone from environment variables
    const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE;
    
    // Notify the admin about the seller's rejection
    if (adminPhone) {
      await sendAdminOrderPendingSeller(adminPhone, {
        orderId: order.orderNumber,
        amount: order.totalAmount,
        customerName: order.user?.name || 'Customer',
        customerPhone: order.user?.phone || 'N/A',
        shippingAddress: formatAddress(order.shippingAddress),
        status: 'REJECTED'
      });
    }
    
    // Initialize refund process with Cashfree (implementation dependent on your Cashfree integration)
    // await initiateRefund(order);
    
    console.log(`Order ${order.id} rejected by seller ${sellerPhone}, refund initiated`);
    
    return true;
  } catch (error) {
    console.error('Error handling order rejection:', error);
    throw error;
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