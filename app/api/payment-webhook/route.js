import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_VERSION = '2022-09-01';

function verifyWebhookSignature(payload, signature) {
  try {
    const data = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_SECRET_KEY)
      .update(data)
      .digest('base64');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const signature = request.headers.get('x-webhook-signature');
    const payload = await request.json();
    
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));
    
    if (!signature) {
      console.error('Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const { order, payment } = payload.data;
    
    if (!order?.order_id || !payment?.payment_id) {
      console.error('Missing required webhook data');
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    // Map Cashfree payment status to our PaymentStatus enum
    let paymentStatus;
    switch (payment.payment_status.toLowerCase()) {
      case 'success':
        paymentStatus = 'SUCCESSFUL';
        break;
      case 'failed':
        paymentStatus = 'FAILED';
        break;
      case 'cancelled':
        paymentStatus = 'FAILED';
        break;
      default:
        paymentStatus = 'PENDING';
    }

    // Update payment transaction
    await prisma.paymentTransaction.upsert({
      where: {
        transactionId: payment.payment_id
      },
      update: {
        status: paymentStatus,
        gatewayResponse: payload,
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        userId: order.customer_details.customer_id,
        orderId: order.order_id,
        amount: payment.payment_amount,
        currency: payment.payment_currency,
        status: paymentStatus,
        paymentMethod: payment.payment_method.toUpperCase(),
        transactionId: payment.payment_id,
        gatewayResponse: payload,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // If payment is successful, update order status
    if (paymentStatus === 'SUCCESSFUL') {
      await prisma.order.update({
        where: {
          id: order.order_id
        },
        data: {
          paymentStatus: 'SUCCESSFUL',
          status: 'CONFIRMED',
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 