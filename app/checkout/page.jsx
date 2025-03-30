"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { FiArrowLeft, FiCreditCard, FiCheckCircle } from "react-icons/fi";
import Link from "next/link";

export default function Checkout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, success, failed
  const [orderDetails, setOrderDetails] = useState(null);

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    // If we don't have a session ID or order ID, redirect to home
    if (!sessionId || !orderId) {
      router.push("/");
      return;
    }

    // Attempt to load the Cashfree SDK
    loadCashfreeSDK();

    // For now, use a dummy order details
    setOrderDetails({
      orderId: orderId,
      amount: "Loading...",
      currency: "INR",
      status: "pending"
    });

    // Simulate loading completion
    setTimeout(() => {
      setLoading(false);
    }, 1500);

  }, [sessionId, orderId, router]);

  const loadCashfreeSDK = () => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return;

    // Load the Cashfree SDK
    const existingScript = document.getElementById('cashfree-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.id = 'cashfree-script';
      script.async = true;
      script.onload = () => {
        console.log('Cashfree SDK loaded');
        // Note: In production, you would initialize the checkout here
        // if window.Cashfree is available
      };
      document.body.appendChild(script);
    }
  };

  const initiatePayment = () => {
    // This function would be called when the user clicks "Proceed to Pay"
    if (typeof window.Cashfree === 'undefined') {
      console.error('Cashfree SDK not loaded');
      return;
    }

    setLoading(true);

    try {
      const cashfree = new window.Cashfree({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox'
      });

      cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: '_self', // Open in the same window
        onSuccess: (data) => {
          // This callback might not be called if redirecting
          console.log('Payment success', data);
          setPaymentStatus('success');
          setLoading(false);
        },
        onFailure: (data) => {
          // This callback might not be called if redirecting
          console.log('Payment failed', data);
          setPaymentStatus('failed');
          setLoading(false);
        },
        onClose: () => {
          // Handle user closing the payment popup
          console.log('Payment window closed');
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Error initiating Cashfree checkout:', error);
      setLoading(false);
    }
  };

  // Render different views based on payment status
  const renderContent = () => {
    switch (paymentStatus) {
      case 'success':
        return (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <FiCheckCircle className="text-green-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h2>
            <p className="text-gray-600 mb-8">
              Your order #{orderDetails?.orderId} has been placed successfully.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors"
            >
              <FiArrowLeft className="mr-2" /> Continue Shopping
            </Link>
          </div>
        );
      
      case 'failed':
        return (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h2>
            <p className="text-gray-600 mb-8">
              There was an issue processing your payment. Please try again.
            </p>
            <button
              onClick={initiatePayment}
              className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors mr-4"
            >
              <FiCreditCard className="mr-2" /> Try Again
            </button>
            <Link 
              href="/"
              className="inline-flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              <FiArrowLeft className="mr-2" /> Back to Home
            </Link>
          </div>
        );
      
      default: // pending
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm flex-1">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mt-4"></div>
                  </div>
                ) : (
                  <div className="space-y-3 border-b pb-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total M.R.P</span>
                      <span className="font-medium">₹1799</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount on M.R.P</span>
                      <span className="font-medium text-green-600">- ₹1200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coupon Discount</span>
                      <button className="text-primary font-medium text-sm">Apply Coupon</button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-medium">₹40</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Convenience Fee</span>
                      <span className="font-medium">₹10</span>
                    </div>
                  </div>
                )}
                {!loading && (
                  <div className="flex justify-between font-bold text-lg mb-6">
                    <span>Total Amount</span>
                    <span>₹649</span>
                  </div>
                )}
                <div className="mt-6">
                  <button
                    onClick={initiatePayment}
                    disabled={loading}
                    className={`w-full flex items-center justify-center bg-primary hover:bg-primary-dark text-white py-3 px-4 rounded-md transition-all ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiCreditCard className="mr-2" />
                        Proceed to Pay
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm md:w-96">
                <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
                <div className="space-y-3">
                  <div className="p-3 border rounded-md flex items-center">
                    <div className="w-12 h-8 flex items-center justify-center mr-3">
                      <Image 
                        src="/credit-card.svg" 
                        alt="Credit Card" 
                        width={32} 
                        height={32}
                        className="object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='1' y='4' width='22' height='16' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='1' y1='10' x2='23' y2='10'%3E%3C/line%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">Credit/Debit Cards</p>
                      <p className="text-xs text-gray-500">Visa, Mastercard, RuPay</p>
                    </div>
                  </div>
                  <div className="p-3 border rounded-md flex items-center">
                    <div className="w-12 h-8 flex items-center justify-center mr-3">
                      <Image 
                        src="/upi.svg" 
                        alt="UPI" 
                        width={32} 
                        height={32}
                        className="object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 9.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3.5'%3E%3C/path%3E%3Cpath d='M14 15V9'%3E%3C/path%3E%3Cpath d='M18 13l-4 4-4-4'%3E%3C/path%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">UPI</p>
                      <p className="text-xs text-gray-500">Google Pay, PhonePe, Paytm</p>
                    </div>
                  </div>
                  <div className="p-3 border rounded-md flex items-center">
                    <div className="w-12 h-8 flex items-center justify-center mr-3">
                      <Image 
                        src="/wallet.svg" 
                        alt="Wallet" 
                        width={32} 
                        height={32}
                        className="object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='1' y='4' width='22' height='16' rx='2' ry='2'%3E%3C/rect%3E%3Crect x='1' y='4' width='22' height='16' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M17 10h4'%3E%3C/path%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">Wallets</p>
                      <p className="text-xs text-gray-500">Paytm, PhonePe, Amazon Pay</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Link 
                href="/"
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                <FiArrowLeft className="inline mr-1" /> Cancel and return to shopping
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.svg"
              alt="Fast&Fab Logo"
              width={160}
              height={50}
              className="mx-auto mb-4"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg width='160' height='50' viewBox='0 0 160 50' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='160' height='50' fill='%23333'/%3E%3Ctext x='80' y='25' font-family='Arial' font-size='18' text-anchor='middle' fill='white'%3EFast&amp;Fab%3C/text%3E%3C/svg%3E";
              }}
            />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Checkout</h1>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
} 