import { NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

// Initialize Cashfree SDK
console.log('Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
  CASHFREE_API_ENV: process.env.CASHFREE_API_ENV,
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL // Add this to debug
});

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION; // Changed from SANDBOX to PRODUCTION

export async function POST(request) {
  try {
    const reqBody = await request.json();
    // TODO: Add validation for request body (amount, currency, customer details etc.)
    console.log("Request Body:", reqBody);

    const { amount, customer_id, customer_email, customer_phone } = reqBody;
    const order_id = `order_${Date.now()}`; // Generate a unique order ID

    // Set a default base URL if environment variable is not available
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fastandfab.in';

    const orderRequest = {
      order_id: order_id,
      order_amount: amount,
      order_currency: "INR", // Assuming INR, change if needed
      customer_details: {
        customer_id: customer_id || `cust_${Date.now()}`, // Use provided or generate one
        customer_email: customer_email || "default@example.com", // Use provided or a default
        customer_phone: customer_phone || "9999999999",     // Use provided or a default
      },
      order_meta: {
        // Optional: Add any metadata you want to associate with the order
        return_url: `${baseUrl}/payment-status?order_id={order_id}`, // Redirect URL after payment
        // notify_url: "YOUR_WEBHOOK_URL", // Optional: URL for server-to-server notifications
      },
      order_note: "FastFab order payment", // Optional order note
    };

    console.log("Creating Cashfree Order with Request:", orderRequest);

    // Use Cashfree SDK to create the order
    const response = await Cashfree.PGCreateOrder("2023-08-01", orderRequest); // Use the correct API version

    console.log("Cashfree API Response:", response.data);

    if (response.data && response.data.payment_session_id) {
      return NextResponse.json(response.data);
    } else {
      // Handle cases where order creation might fail or response is unexpected
      console.error("Failed to create Cashfree order or missing payment_session_id:", response);
      return NextResponse.json({ error: 'Failed to create payment session', details: response.data }, { status: 500 });
    }

  } catch (error) {
    console.error("Error creating Cashfree order:", error);
    console.error("Error response data:", error.response?.data); // Add this to see detailed error
    // Extract more specific error info if available from Cashfree's response structure
    const errorDetails = error.response?.data || { message: error.message };
    return NextResponse.json({ error: 'Internal Server Error', details: errorDetails }, { status: 500 });
  }
} 