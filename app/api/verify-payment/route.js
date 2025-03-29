import { NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

// Initialize Cashfree SDK
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = process.env.CASHFREE_API_ENV === 'PRODUCTION' 
  ? Cashfree.Environment.PRODUCTION 
  : Cashfree.Environment.SANDBOX;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');
    const payment_id = searchParams.get('payment_id');

    if (!order_id) {
      return NextResponse.json({
        success: false,
        message: 'Missing order_id parameter',
      }, { status: 400 });
    }

    console.log('Verifying payment for order:', order_id, 'payment ID:', payment_id);

    try {
      // Call Cashfree API to get order details
      const orderResponse = await Cashfree.PGFetchOrder("2023-08-01", {
        order_id: order_id
      });

      console.log('Cashfree order response:', orderResponse.data);

      if (orderResponse.data && orderResponse.data.order_status) {
        const { order_status, order_amount, order_currency } = orderResponse.data;
        
        let payment_status;
        switch (order_status.toLowerCase()) {
          case 'paid':
            payment_status = 'SUCCESS';
            break;
          case 'failed':
            payment_status = 'FAILED';
            break;
          case 'active':
            payment_status = 'PENDING';
            break;
          default:
            payment_status = 'UNKNOWN';
            break;
        }

        return NextResponse.json({
          success: true,
          payment_status,
          order_details: {
            order_id,
            amount: order_amount,
            currency: order_currency
          }
        });
      } else {
        // If we don't get expected response format
        console.error('Unexpected response format from Cashfree:', orderResponse);
        return NextResponse.json({
          success: false,
          payment_status: 'UNKNOWN',
          message: 'Could not determine payment status'
        }, { status: 500 });
      }
    } catch (apiError) {
      console.error('Cashfree API error:', apiError);
      
      // If Cashfree API fails, use any payment ID info we have
      if (payment_id) {
        // Try to determine status from payment ID parameter
        // This is a fallback only and shouldn't be relied upon in production
        return NextResponse.json({
          success: true,
          payment_status: payment_id.includes('FAILED') ? 'FAILED' : 'PENDING',
          message: 'Status based on payment ID pattern (fallback)',
          order_details: {
            order_id,
            amount: 'N/A',
            currency: 'INR'
          }
        });
      }
      
      // If all else fails
      return NextResponse.json({
        success: false,
        payment_status: 'UNKNOWN',
        message: 'Failed to fetch payment status',
        error: apiError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
} 