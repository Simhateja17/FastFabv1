import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid'; // For generating unique order IDs

const CASHFREE_API_KEY = process.env.CASHFREE_API_KEY;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_VERSION = '2023-08-01';
const CASHFREE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

// Ensure this URL matches your deployment structure
// It must include the {order_id} placeholder for Cashfree
const RETURN_URL = `${process.env.NEXT_PUBLIC_APP_URL}/payment-status?order_id={order_id}`;

export async function POST(request) {
  try {
    const { amount, currency = 'INR', customer_details } = await request.json();

    if (!amount || !customer_details?.customer_id || !customer_details?.customer_email || !customer_details?.customer_phone) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, customer_id, customer_email, customer_phone' },
        { status: 400 }
      );
    }

    const order_id = `order_${uuidv4()}`;

    const orderPayload = {
      order_id: order_id,
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: customer_details.customer_id,
        customer_email: customer_details.customer_email,
        customer_phone: customer_details.customer_phone,
        customer_name: customer_details.customer_name || '', // Optional
      },
      order_meta: {
        return_url: RETURN_URL.replace('{order_id}', order_id), // Replace placeholder
        // notify_url: "YOUR_WEBHOOK_URL", // Optional: For server-to-server notifications
      },
      order_note: customer_details.order_note || 'Order from FastFab', // Optional
    };

    console.log('Creating Cashfree order with payload:', JSON.stringify(orderPayload, null, 2));
    console.log('Using Return URL:', orderPayload.order_meta.return_url);

    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': CASHFREE_API_KEY,
        'x-client-secret': CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify(orderPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Cashfree API Error Response:', responseData);
      throw new Error(
        responseData.message || 'Failed to create Cashfree order'
      );
    }

    console.log('Cashfree Order Creation Success:', responseData);

    // Essential fields for the frontend SDK
    const { payment_session_id, order_id: cf_order_id } = responseData;

    if (!payment_session_id || !cf_order_id) {
       console.error('Missing payment_session_id or order_id in Cashfree response', responseData);
       throw new Error('Invalid response from Cashfree');
    }

    return NextResponse.json({ 
      success: true, 
      payment_session_id, 
      order_id: cf_order_id 
    });

  } catch (error) {
    console.error('Error creating Cashfree payment order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 