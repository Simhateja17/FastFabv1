import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CASHFREE_API_KEY = process.env.CASHFREE_API_KEY;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export async function POST(request) {
  try {
    const { order_id, payment_id } = await request.json();

    if (!order_id) {
      console.error('Missing order_id in payment verification request');
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log(`Verifying payment for order: ${order_id}, payment: ${payment_id || 'N/A'}`);

    // Get order details from Cashfree
    const response = await fetch(
      `${CASHFREE_BASE_URL}/orders/${order_id}/payments`,
      {
        headers: {
          'x-api-version': '2022-09-01',
          'x-client-id': CASHFREE_API_KEY,
          'x-client-secret': CASHFREE_SECRET_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cashfree API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error('Failed to fetch payment status from Cashfree');
    }

    const data = await response.json();
    console.log('Cashfree payment data:', JSON.stringify(data, null, 2));
    
    // If payment_id is provided, find the specific payment
    let payment = payment_id 
      ? data.find(p => p.payment_id === payment_id)
      : data[0]; // Get the latest payment if no specific payment_id

    if (!payment) {
      console.error(`Payment not found. Order: ${order_id}, Payment: ${payment_id || 'N/A'}`);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Map Cashfree payment status to our application status
    let payment_status;
    switch (payment.payment_status.toLowerCase()) {
      case 'success':
        payment_status = 'PAID';
        break;
      case 'failed':
      case 'cancelled':
        payment_status = 'failed';
        break;
      default:
        payment_status = 'processing';
    }

    // Update payment transaction in our database
    try {
      await prisma.paymentTransaction.upsert({
        where: {
          transactionId: payment.payment_id
        },
        update: {
          status: payment_status === 'PAID' ? 'SUCCESSFUL' : 
                 payment_status === 'failed' ? 'FAILED' : 'PENDING',
          gatewayResponse: payment,
          updatedAt: new Date()
        },
        create: {
          id: payment.payment_id,
          userId: payment.customer_details?.customer_id || 'unknown',
          orderId: order_id,
          amount: payment.payment_amount,
          currency: payment.payment_currency,
          status: payment_status === 'PAID' ? 'SUCCESSFUL' : 
                 payment_status === 'failed' ? 'FAILED' : 'PENDING',
          paymentMethod: payment.payment_method?.toUpperCase() || 'CREDIT_CARD',
          transactionId: payment.payment_id,
          gatewayResponse: payment,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (dbError) {
      console.error('Database error while updating payment:', dbError);
      // Don't throw error here, continue with response
    }

    return NextResponse.json({
      payment_status,
      order_details: {
        order_id,
        payment_id: payment.payment_id,
        amount: payment.payment_amount,
        currency: payment.payment_currency,
        payment_method: payment.payment_method,
        payment_time: payment.payment_completion_time,
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment status' },
      { status: 500 }
    );
  }
} 