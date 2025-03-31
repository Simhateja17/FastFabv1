"use client";

import { useState, useEffect, useContext, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { FiArrowLeft, FiCreditCard, FiCheckCircle } from "react-icons/fi";
import Link from "next/link";
import { useUserAuth } from "@/app/context/UserAuthContext"; // Import the auth context

// Loading component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded w-40 mx-auto mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mt-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate component that uses useSearchParams
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, success, failed
  const [orderDetails, setOrderDetails] = useState(null);
  const { user, login, authLoading } = useUserAuth(); // Get auth context

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  // Special effect to ensure user stays logged in
  useEffect(() => {
    const syncAuthState = async () => {
      if (typeof window === "undefined") return;

      try {
        // Get auth info from localStorage
        const accessToken = localStorage.getItem("accessToken");
        const userDataStr = localStorage.getItem("user");

        if (accessToken && userDataStr) {
          const userData = JSON.parse(userDataStr);
          console.log(
            "Ensuring user stays logged in on checkout page:",
            userData?.name || "Anonymous user"
          );

          // If we have token but auth context doesn't show user as logged in (or is still loading)
          if (!user && accessToken) {
            // Force login with the stored data to ensure auth context is updated
            console.log("Forced login to maintain session");
            if (login && typeof login === "function") {
              await login({ accessToken, user: userData });
            }
          }
        }

        // Also check payment session for auth data as backup
        const paymentSession = localStorage.getItem("payment_session");
        if (paymentSession) {
          const sessionData = JSON.parse(paymentSession);
          console.log(
            "Found payment session with auth data:",
            sessionData?.auth
          );

          // If we have auth data in payment session but no user in context, try to restore
          if (sessionData?.auth?.isAuthenticated && !user && !accessToken) {
            console.log("Attempting to restore auth from payment session");
            // In a real application, you would call your API to validate the token
            // and retrieve fresh user data if the token is still valid
          }
        }
      } catch (error) {
        console.error("Error syncing auth state:", error);
      }
    };

    syncAuthState();
  }, [user, login]);

  useEffect(() => {
    // Restore authentication state first
    if (typeof window !== "undefined") {
      // We handle this in the separate useEffect above
    }

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
      status: "pending",
    });

    // Load the real order details
    fetchOrderDetails(orderId);

    // Simulate loading completion
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, [sessionId, orderId, router]);

  const loadCashfreeSDK = () => {
    // Check if we're in the browser
    if (typeof window === "undefined") return;

    // Load the Cashfree SDK
    const existingScript = document.getElementById("cashfree-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.id = "cashfree-script";
      script.async = true;
      script.onload = () => {
        console.log("Cashfree SDK loaded");
        // Note: In production, you would initialize the checkout here
        // if window.Cashfree is available
      };
      document.body.appendChild(script);
    }
  };

  const initiatePayment = () => {
    // Check if user is logged in and preserve auth state again before payment
    const accessToken = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (accessToken && userData) {
      console.log("Preserving auth state before initiating payment");
      // Refresh token in localStorage to ensure it doesn't expire
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", userData);
    }

    // Verify we have a valid session ID before proceeding
    if (!sessionId) {
      console.error("Session ID missing, cannot proceed with payment");
      setLoading(false);
      // Redirect to product page or show error
      router.push("/");
      return;
    }

    if (typeof window.Cashfree === "undefined") {
      console.error("Cashfree SDK not loaded");
      return;
    }

    setLoading(true);

    try {
      console.log(`Initiating payment with session ID: ${sessionId}`);
      const cashfree = new window.Cashfree({
        mode: "production", // Force production mode explicitly
      });

      cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_self", // Open in the same window
        onSuccess: (data) => {
          // This callback might not be called if redirecting
          console.log("Payment success", data);
          setPaymentStatus("success");
          setLoading(false);
        },
        onFailure: (data) => {
          // This callback might not be called if redirecting
          console.log("Payment failed", data);
          setPaymentStatus("failed");
          setLoading(false);
        },
        onClose: () => {
          // Handle user closing the payment popup
          console.log("Payment window closed");
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Error initiating Cashfree checkout:", error);
      setLoading(false);
    }
  };

  // New function to fetch order details
  const fetchOrderDetails = async (orderId) => {
    try {
      // Try to get the access token in case the user is logged in
      const accessToken = localStorage.getItem("accessToken");
      const headers = {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      // Call our API to get order details
      const response = await fetch(`/api/orders/${orderId}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setOrderDetails({
          orderId: data.order_id,
          amount: data.order_amount,
          currency: data.order_currency,
          status: data.order_status,
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      // We already have fallback data set, so no need to do anything
    }
  };

  // Render different views based on payment status
  const renderContent = () => {
    switch (paymentStatus) {
      case "success":
        return (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <FiCheckCircle className="text-green-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Payment Successful!
            </h2>
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

      case "failed":
        return (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Payment Failed
            </h2>
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID</span>
                      <span className="font-medium">
                        {orderDetails?.orderId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-medium">
                        ₹{orderDetails?.amount}
                      </span>
                    </div>
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
                          e.target.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='1' y='4' width='22' height='16' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='1' y1='10' x2='23' y2='10'%3E%3C/line%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">Credit/Debit Cards</p>
                      <p className="text-xs text-gray-500">
                        Visa, Mastercard, RuPay
                      </p>
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
                          e.target.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 9.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3.5'%3E%3C/path%3E%3Cpath d='M14 15V9'%3E%3C/path%3E%3Cpath d='M18 13l-4 4-4-4'%3E%3C/path%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">UPI</p>
                      <p className="text-xs text-gray-500">
                        Google Pay, PhonePe, Paytm
                      </p>
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
                          e.target.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='1' y='4' width='22' height='16' rx='2' ry='2'%3E%3C/rect%3E%3Crect x='1' y='4' width='22' height='16' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M17 10h4'%3E%3C/path%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">Wallets</p>
                      <p className="text-xs text-gray-500">
                        Paytm, PhonePe, Amazon Pay
                      </p>
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
                <FiArrowLeft className="inline mr-1" /> Cancel and return to
                shopping
              </Link>
            </div>
          </div>
        );
    }
  };

  return renderContent();
}

// Main component with Suspense boundary
export default function Checkout() {
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
                e.target.src =
                  "data:image/svg+xml,%3Csvg width='160' height='50' viewBox='0 0 160 50' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='160' height='50' fill='%23333'/%3E%3Ctext x='80' y='25' font-family='Arial' font-size='18' text-anchor='middle' fill='white'%3EFast&amp;Fab%3C/text%3E%3C/svg%3E";
              }}
            />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Checkout</h1>
        </div>

        <Suspense fallback={<LoadingFallback />}>
          <CheckoutContent />
        </Suspense>
      </div>
    </div>
  );
}
