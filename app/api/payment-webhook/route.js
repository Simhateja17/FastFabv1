import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * This endpoint receives webhook notifications from Cashfree about payment status changes
 * It verifies the signature and processes the payment update
 */
export async function POST(request) {
  try {
    // Get the request body
    const body = await request.json();
    // Extract headers for signature verification
    const cashfreeSignature = request.headers.get('x-webhook-signature') || '';
    const timestamp = request.headers.get('x-webhook-timestamp') || '';
    
    console.log("Cashfree Webhook Received:", {
      timestamp,
      signature: cashfreeSignature ? 'Present' : 'Missing',
      data: body
    });
    
    // Verify the signature
    // Note: In production, you should uncomment and implement this
    /*
    if (!verifyWebhookSignature(cashfreeSignature, timestamp, JSON.stringify(body))) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid signature' 
      }, { status: 401 });
    }
    */
    
    // Extract relevant payment information from the body
    const { 
      event, 
      data: {
        order: {
          order_id,
          order_amount,
          order_currency,
          order_status
        } = {},
        payment: {
          cf_payment_id,
          payment_status,
          payment_method 
        } = {}
      } = {}
    } = body;

    // Log the payment status update
    console.log(`Payment update for order ${order_id}: ${payment_status}`);
    
    // Process the webhook event
    if (event === 'PAYMENT_SUCCESS' || payment_status === 'SUCCESS') {
      // Handle successful payment
      // Here you would:
      // 1. Update your database with the payment status
      // 2. Trigger any fulfillment processes
      // 3. Send confirmation emails to customers
      
      console.log(`Payment successful for order ${order_id}, amount: ${order_amount} ${order_currency}`);
      
      // Example database update (pseudo-code):
      // await updateOrderStatus(order_id, 'PAID');
      // await createOrderRecord(order_id, payment_status, cf_payment_id, payment_method);
      
    } else if (event === 'PAYMENT_FAILED' || payment_status === 'FAILED') {
      // Handle failed payment
      console.log(`Payment failed for order ${order_id}`);
      
      // Example database update (pseudo-code):
      // await updateOrderStatus(order_id, 'PAYMENT_FAILED');
      
    } else {
      // Handle other statuses (pending, cancelled, etc.)
      console.log(`Payment status update for order ${order_id}: ${payment_status}`);
      
      // Example database update (pseudo-code):
      // await updateOrderStatus(order_id, payment_status);
    }

    // Always return a 200 response to Cashfree to acknowledge receipt
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Always return a 200 response even for errors to prevent Cashfree retries
    // But log the error for your records
    return NextResponse.json({ 
      success: false, 
      message: 'Error processing webhook'
    }, { status: 200 });
  }
}

/**
 * Verifies the signature from Cashfree webhook
 * See: https://docs.cashfree.com/reference/webhooks
 */
function verifyWebhookSignature(signature, timestamp, body) {
  try {
    if (!signature || !timestamp || !body) {
      return false;
    }
    
    // Your Cashfree secret key from env vars
    const secret = process.env.CASHFREE_SECRET_KEY;
    
    // Create the message by combining timestamp and body
    const message = timestamp + body;
    
    // Create the HMAC signature
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64');
    
    // Compare the computed signature with the provided one
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
} 