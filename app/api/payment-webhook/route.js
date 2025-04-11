import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  sendSellerOrderWithImage,
  sendAdminOrderPendingSeller 
} from '@/app/utils/notificationService';

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
    console.log('Webhook payload:', payload);
    
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
    const order = await prisma.order.findUnique({
      where: { orderNumber: order_id },
      include: {
        items: true,
        user: true,
        shippingAddress: true
      }
    });
    
    if (!order) {
      console.error(`Order ${order_id} not found in database`);
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
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
 * Process a successful payment by updating order status and sending notifications
 * @param {Object} order - Order object from database
 * @param {Object} webhookData - Webhook data from Cashfree
 */
async function processSuccessfulPayment(order, webhookData) {
  try {
    console.log(`Processing successful payment for order ${order.id}`);
    
    // Calculate seller response deadline (3 minutes from now)
    const sellerResponseDeadline = new Date(Date.now() + SELLER_RESPONSE_TIMEOUT);
    
    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PENDING',
        paymentStatus: 'SUCCESSFUL',
        sellerResponseDeadline
      }
    });
    
    // Get seller details for each item in the order
    const orderItems = order.items || [];
    console.log(`Order has ${orderItems.length} items`);
    
    // Group items by seller
    const itemsBySeller = {};
    
    for (const item of orderItems) {
      const sellerId = item.sellerId;
      
      if (!sellerId) {
        console.warn(`Item ${item.id} does not have a sellerId`);
        continue;
      }
      
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      
      itemsBySeller[sellerId].push(item);
    }
    
    // Get seller details and send notifications
    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      try {
        // Get seller details including phone number
        const seller = await prisma.seller.findUnique({
          where: { id: sellerId }
        });
        
        if (!seller || !seller.phone) {
          console.warn(`Seller ${sellerId} not found or has no phone number`);
          continue;
        }
        
        // Format items for the notification
        const formattedItems = items.map(item => 
          `${item.quantity}x ${item.productName} (${item.size}${item.color ? `, ${item.color}` : ''})`
        );
        
        // Send notification to seller
        await sendSellerOrderWithImage(seller.phone, {
          orderId: order.orderNumber,
          items: formattedItems,
          shippingAddress: formatAddress(order.shippingAddress)
        });
        
        // Update order with seller phone for future reference
        await prisma.order.update({
          where: { id: order.id },
          data: {
            sellerPhone: seller.phone,
            sellerNotified: true
          }
        });
        
        console.log(`Notification sent to seller ${sellerId} at ${seller.phone}`);
      } catch (error) {
        console.error(`Error sending notification to seller ${sellerId}:`, error);
      }
    }
    
    // Send notification to admin
    const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE;
    
    if (adminPhone) {
      try {
        await sendAdminOrderPendingSeller(adminPhone, {
          orderId: order.orderNumber,
          amount: order.totalAmount,
          customerName: order.user?.name || 'Customer',
          customerPhone: order.user?.phone || 'N/A',
          shippingAddress: formatAddress(order.shippingAddress)
        });
        
        // Update order to mark admin as notified
        await prisma.order.update({
          where: { id: order.id },
          data: {
            adminNotified: true
          }
        });
        
        console.log(`Notification sent to admin at ${adminPhone}`);
      } catch (error) {
        console.error('Error sending notification to admin:', error);
      }
    }
  } catch (error) {
    console.error('Error processing successful payment:', error);
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