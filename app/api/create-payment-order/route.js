import { NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

// Initialize Cashfree SDK with production credentials
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION; // Force production mode

console.log("Cashfree Configuration:", {
  AppId: process.env.CASHFREE_APP_ID?.substring(0, 5) + '...',
  Environment: "PRODUCTION", // Log that we're explicitly using production
  ApiUrl: process.env.CASHFREE_API_URL || "https://api.cashfree.com/pg"
});

export async function POST(request) {
  try {
    const reqBody = await request.json();
    // TODO: Add validation for request body (amount, currency, customer details etc.)
    console.log("Payment Request Body:", {
      ...reqBody, 
      amount: reqBody.amount,
      customer_id: reqBody.customer_id,
      auth: reqBody.auth ? {
        isAuthenticated: reqBody.auth.isAuthenticated,
        user_id: reqBody.auth.user_id
      } : null
    });

    const { amount, customer_id, customer_email, customer_phone, product_details } = reqBody;
    const order_id = `order_${Date.now()}`; // Generate a unique order ID

    // Ensure we're using HTTPS for all URLs
    const secureBaseUrl = "https://fastandfab.in";

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
        return_url: `https://fastandfab.in/payment-status?order_id={order_id}`, 
        notify_url: `https://fastandfab.in/api/payment-webhook`,
      },
      order_note: product_details?.name || "FastFab purchase", // Use product name in order note
    };

    console.log("Creating Cashfree Order with Request:", JSON.stringify(orderRequest, null, 2));

    try {
      // Use Cashfree SDK to create the order with latest API version
      const response = await Cashfree.PGCreateOrder("2023-08-01", orderRequest);
      console.log("Cashfree API Response:", response.data);

      if (response.data && response.data.payment_session_id) {
        // Store the auth data with the session for later use
        if (reqBody.auth) {
          // You could store this in a database for later verification
          console.log(`Order ${order_id} created for ${reqBody.auth.isAuthenticated ? 'authenticated' : 'guest'} user`);
        }
        
        // Log the session ID for debugging
        console.log(`Payment session ID: ${response.data.payment_session_id.substring(0, 10)}...`);
        
        return NextResponse.json({
          ...response.data,
          created_at: new Date().toISOString()
        });
      } else {
        // Handle cases where order creation might fail or response is unexpected
        console.error("Failed to create Cashfree order or missing payment_session_id:", response);
        return NextResponse.json({ error: 'Failed to create payment session', details: response.data }, { status: 500 });
      }
    } catch (apiError) {
      console.error("Cashfree API Error:", apiError.response?.data || apiError.message);
      console.error("Error Stack:", apiError.stack);
      
      const errorData = apiError.response?.data || { 
        message: apiError.message,
        type: "api_error"
      };
      
      return NextResponse.json({ 
        error: 'Failed to create payment with Cashfree', 
        details: errorData
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error creating Cashfree order:", error);
    console.error("Error Stack:", error.stack);
    
    // Extract more specific error info if available from Cashfree's response structure
    const errorDetails = error.response ? error.response.data : { message: error.message };
    return NextResponse.json({ error: 'Internal Server Error', details: errorDetails }, { status: 500 });
  }
} 