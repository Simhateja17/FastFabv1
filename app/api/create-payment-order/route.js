import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid'; // For generating unique order IDs

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_VERSION = '2022-09-01';
const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

// Get the app URL from environment variable or default to localhost
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request) {
  try {
    const { order_id, amount, currency = 'INR', customer_details } = await request.json();

    if (!order_id || !amount || !customer_details?.customer_id || !customer_details?.customer_phone) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, amount, customer_id, customer_phone' },
        { status: 400 }
      );
    }

    const orderPayload = {
      order_id,
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: customer_details.customer_id,
        customer_phone: customer_details.customer_phone,
        customer_name: customer_details.customer_name || '',
      },
      order_meta: {
        return_url: `${APP_URL}/payment-status?order_id={order_id}`,
        notify_url: `${APP_URL}/api/payment-webhook`,
      },
      order_tags: {
        source: 'web'
      }
    };

    // Add email to the payload only if it exists
    if (customer_details.customer_email) {
      orderPayload.customer_details.customer_email = customer_details.customer_email;
    }

    console.log('Creating Cashfree order with payload:', JSON.stringify(orderPayload, null, 2));

    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify(orderPayload),
    });

    const responseData = await response.json();
    console.log('Cashfree API Response:', responseData);

    if (!response.ok) {
      console.error('Cashfree API Error:', responseData);
      throw new Error(responseData.message || 'Failed to create Cashfree order');
    }

    return NextResponse.json({ 
      success: true,
      order_id: responseData.order_id,
      payment_session_id: responseData.payment_session_id,
      order_status: responseData.order_status,
      cf_order_id: responseData.cf_order_id
    });

  } catch (error) {
    console.error('Error creating Cashfree payment order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 