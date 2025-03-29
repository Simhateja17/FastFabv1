import { NextResponse } from 'next/server';
import { Cashfree } from 'cashfree-pg';

// Initialize Cashfree SDK
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = process.env.CASHFREE_API_ENV === 'PRODUCTION' 
  ? Cashfree.Environment.PRODUCTION 
  : Cashfree.Environment.SANDBOX;

export async function GET(request, { params }) {
  try {
    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'Order ID is required'
      }, { status: 400 });
    }
    
    console.log('Fetching order details for:', orderId);
    
    try {
      // Call Cashfree API to get order details
      const orderResponse = await Cashfree.PGFetchOrder("2023-08-01", {
        order_id: orderId
      });

      console.log('Order details response:', orderResponse.data);
      
      if (orderResponse.data) {
        return NextResponse.json({
          success: true,
          ...orderResponse.data
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Order not found or no data available'
        }, { status: 404 });
      }
    } catch (apiError) {
      console.error('Cashfree API error:', apiError.response?.data || apiError.message);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch order details',
        error: apiError.response?.data?.message || apiError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
} 