import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Function to verify Cashfree webhook signature
function verifyWebhookSignature(payload, signature) {
  try {
    // Get the secret key from environment variables
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    
    // Create HMAC using the secret key
    const hmac = crypto.createHmac('sha256', secretKey);
    
    // Update HMAC with the payload (stringified if it's an object)
    if (typeof payload === 'object') {
      hmac.update(JSON.stringify(payload));
    } else {
      hmac.update(payload.toString());
    }
    
    // Get the digest in hex format
    const generatedSignature = hmac.digest('hex');
    
    // Compare the generated signature with the provided signature
    return generatedSignature === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    // Get the request body and Cashfree signature from headers
    const body = await request.json();
    const signature = request.headers.get('x-webhook-signature');
    
    console.log('Received payment webhook:', body);
    console.log('Webhook signature:', signature);
    
    // Verify the signature if available
    if (signature) {
      const isValid = verifyWebhookSignature(body, signature);
      if (!isValid) {
        console.warn('Invalid webhook signature');
        return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('No signature provided in webhook request');
    }
    
    // Extract order details from webhook
    const { order, payment = {} } = body.data || {};
    if (!order || !order.order_id) {
      return NextResponse.json({ success: false, message: 'Missing order information' }, { status: 400 });
    }
    
    // Determine payment status
    let paymentStatus;
    switch ((payment.payment_status || '').toLowerCase()) {
      case 'success':
        paymentStatus = 'SUCCESSFUL';
        break;
      case 'failed':
        paymentStatus = 'FAILED';
        break;
      case 'pending':
        paymentStatus = 'PENDING';
        break;
      default:
        paymentStatus = 'UNKNOWN';
    }
    
    // Update the order and payment transaction in the database
    try {
      // Extract orderId from Cashfree's order_id which might have a prefix
      const orderId = order.order_id.replace(/^order_/, '');
      
      // Find the order in our database
      const dbOrder = await prisma.order.findFirst({
        where: { orderNumber: orderId }
      });
      
      if (!dbOrder) {
        console.error(`Order not found for orderId: ${orderId}`);
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
      }
      
      // Update order and payment transaction
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: dbOrder.id },
          data: { 
            paymentStatus,
            status: paymentStatus === 'SUCCESSFUL' ? 'CONFIRMED' : 
                    paymentStatus === 'FAILED' ? 'CANCELLED' : 'PENDING'
          }
        });
        
        // Update or create payment transaction
        const transaction = await tx.paymentTransaction.findFirst({
          where: { orderId: dbOrder.id }
        });
        
        if (transaction) {
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: paymentStatus,
              transactionId: payment.cf_payment_id || payment.payment_id,
              gatewayResponse: body,
              updatedAt: new Date()
            }
          });
        } else {
          await tx.paymentTransaction.create({
            data: {
              id: crypto.randomUUID(),
              orderId: dbOrder.id,
              userId: dbOrder.userId,
              amount: order.order_amount,
              currency: order.order_currency || 'INR',
              status: paymentStatus,
              paymentMethod: 'ONLINE',
              transactionId: payment.cf_payment_id || payment.payment_id,
              gatewayResponse: body,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      });
      
      return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
    } catch (dbError) {
      console.error('Error updating database from webhook:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database update failed', error: dbError.message }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
} 