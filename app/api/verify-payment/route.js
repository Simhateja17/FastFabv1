import { NextResponse } from 'next/server';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export async function POST(request) {
  try {
    const { order_id, payment_id } = await request.json();

    if (!order_id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order details from Cashfree
    const response = await fetch(
      `${CASHFREE_BASE_URL}/orders/${order_id}/payments`,
      {
        headers: {
          'x-api-version': '2022-09-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch payment status from Cashfree');
    }

    const data = await response.json();
    
    // If payment_id is provided, find the specific payment
    let payment = payment_id 
      ? data.find(p => p.payment_id === payment_id)
      : data[0]; // Get the latest payment if no specific payment_id

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Map Cashfree payment status to our application status
    let payment_status;
    switch (payment.payment_status) {
      case 'SUCCESS':
        payment_status = 'PAID';
        break;
      case 'FAILED':
      case 'CANCELLED':
        payment_status = 'failed';
        break;
      default:
        payment_status = 'processing';
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