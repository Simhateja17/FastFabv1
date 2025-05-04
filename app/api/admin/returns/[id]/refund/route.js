import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAdminAuth } from "@/app/utils/adminAuth";
import axios from "axios";

const prisma = new PrismaClient();

// Get environment variables for Cashfree API
const CASHFREE_API_URL = process.env.CASHFREE_API_URL || "https://sandbox.cashfree.com/pg";
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || "2022-09-01";

export async function POST(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: authResult.status || 401 }
      );
    }
    
    const returnId = params.id;
    const body = await request.json();
    const { refundAmount, refundNote } = body;
    
    // Validate required fields
    if (!refundAmount) {
      return NextResponse.json(
        { message: "Refund amount is required" },
        { status: 400 }
      );
    }
    
    // Fetch the return request details including order info
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: true
      }
    });
    
    if (!returnRequest) {
      return NextResponse.json(
        { message: "Return request not found" },
        { status: 404 }
      );
    }
    
    // Ensure the return request is in approved status
    if (returnRequest.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Return request must be approved before processing a refund" },
        { status: 400 }
      );
    }
    
    const orderId = returnRequest.order.orderNumber;
    
    // Generate a unique refund ID
    const refundId = `refund_${Date.now()}_${returnId.substring(0, 8)}`;
    
    // Create the refund payload for Cashfree API
    const refundPayload = {
      refund_amount: refundAmount,
      refund_id: refundId,
      refund_note: refundNote || "Refund for returned item",
      refund_speed: "STANDARD"
    };
    
    // Call Cashfree API to process the refund
    const response = await axios.post(
      `${CASHFREE_API_URL}/orders/${orderId}/refunds`,
      refundPayload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-version': CASHFREE_API_VERSION,
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_CLIENT_SECRET
        }
      }
    );
    
    // Record the refund in the database
    await prisma.paymentTransaction.create({
      data: {
        userId: returnRequest.userId,
        orderId: returnRequest.orderId,
        amount: refundAmount,
        status: "REFUNDED",
        paymentMethod: returnRequest.order.paymentMethod,
        currency: "INR",
        transactionId: refundId,
        gatewayResponse: {
          cashfreeRefundId: response.data?.cf_refund_id,
          returnRequestId: returnId,
          originalAmount: returnRequest.amount,
          processingFee: 50, // Hard-coded processing fee
          refundResponse: response.data
        }
      }
    });
    
    // Return success response with Cashfree response data
    return NextResponse.json({
      message: "Refund processed successfully",
      refundId: refundId,
      cashfreeResponse: response.data
    });
    
  } catch (error) {
    console.error("Error processing refund:", error);
    
    // Handle Cashfree API errors
    if (error.response) {
      return NextResponse.json(
        { 
          message: "Cashfree API error", 
          error: error.response.data || error.message,
          status: error.response.status
        },
        { status: error.response.status || 500 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { message: "Failed to process refund", error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 