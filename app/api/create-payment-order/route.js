import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid'; // For generating unique order IDs

const CASHFREE_API_KEY = process.env.CASHFREE_API_KEY;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_VERSION = '2022-09-01';
const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

// Get the app URL from environment variable or default to localhost
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request) {
  try {
    const { amount, currency, customer_details } = await request.json();
    
    const apiKey = process.env.CASHFREE_API_KEY;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const apiEnv = process.env.CASHFREE_API_ENV || 'SANDBOX';
    
    if (!apiKey || !secretKey) {
      throw new Error('Cashfree credentials not configured');
    }

    const orderPayload = {
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: customer_details.customer_id,
        customer_phone: customer_details.customer_phone,
        customer_name: customer_details.customer_name
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment-status?order_id={order_id}`,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment-webhook`
      }
    };

    const response = await fetch(`${process.env.CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': apiKey,
        'x-client-secret': secretKey
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree API error:', data);
      throw new Error(data.message || 'Failed to create payment order');
    }

    return NextResponse.json({
      success: true,
      payment_session_id: data.payment_session_id,
      order_id: data.order_id
    });

  } catch (error) {
    console.error('Payment order creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
} 