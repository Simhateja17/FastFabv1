"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaHome } from "react-icons/fa";
import { useUserAuth } from "@/app/context/UserAuthContext";

export default function PaymentStatus() {
  const { user } = useUserAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("PENDING");
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get order ID and other params from URL
  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("payment_id");
  const txStatus = searchParams.get("txStatus");

  // Verify payment effect
  useEffect(() => {
    async function verifyPayment() {
      if (!orderId) {
        router.push("/");
        return;
      }

      setLoading(true);

      try {
        // Call your API to verify payment status
        const accessToken = localStorage.getItem("userAccessToken");
        const headers = {
          "Content-Type": "application/json",
        };
        
        // Add authorization header if token exists
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const response = await fetch(
          `/api/verify-payment?order_id=${orderId}&payment_id=${paymentId || ''}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error("Failed to verify payment status");
        }

        const data = await response.json();

        // Set payment status based on API response
        setStatus(data.payment_status || txStatus || "PENDING");
        setOrderDetails(
          data.order_details || {
            order_id: orderId,
            amount: "Unknown",
            currency: "INR",
          }
        );
      } catch (error) {
        console.error("Error verifying payment:", error);
        // Use txStatus from URL as fallback
        if (txStatus) {
          setStatus(txStatus);
        } else {
          setStatus("UNKNOWN");
        }
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [orderId, paymentId, txStatus, router]);

  // Helper to render the right icon based on status
  const renderStatusIcon = () => {
    const iconSize = 64;
    switch (status?.toUpperCase()) {
      case "SUCCESS":
      case "SUCCESSFUL":
      case "PAID":
      case "CONFIRMED":
        return <FaCheckCircle size={iconSize} className="text-green-600" />;
      case "FAILED":
      case "FAILURE":
      case "CANCELLED":
        return <FaTimesCircle size={iconSize} className="text-red-600" />;
      case "PENDING":
        return <FaSpinner size={iconSize} className="text-yellow-500 animate-spin" />;
      default:
        return <FaSpinner size={iconSize} className="text-gray-500" />;
    }
  };

  // Helper to render the status text and message
  const getStatusDetails = () => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
      case "SUCCESSFUL":
      case "PAID":
      case "CONFIRMED":
        return {
          title: "Payment Successful",
          message: "Your order has been confirmed and is being processed.",
          actionText: "View Order",
          actionUrl: `/orders/${orderId}`,
          showHomeButton: true,
          textColor: "text-green-600",
        };
      case "FAILED":
      case "FAILURE":
        return {
          title: "Payment Failed",
          message: "We couldn't process your payment. Please try again later.",
          actionText: "Try Again",
          actionUrl: "/checkout",
          showHomeButton: true,
          textColor: "text-red-600",
        };
      case "CANCELLED":
        return {
          title: "Payment Cancelled",
          message: "Your payment was cancelled. Your order will not be processed.",
          actionText: "Return to Cart",
          actionUrl: "/cart",
          showHomeButton: true,
          textColor: "text-red-600",
        };
      case "PENDING":
        return {
          title: "Payment Processing",
          message: "Your payment is being processed. Please wait a moment...",
          actionText: null,
          showHomeButton: false,
          textColor: "text-yellow-500",
        };
      default:
        return {
          title: "Payment Status Unknown",
          message: "We couldn't determine the status of your payment.",
          actionText: "Contact Support",
          actionUrl: "/contact",
          showHomeButton: true,
          textColor: "text-gray-600",
        };
    }
  };

  const statusDetails = getStatusDetails();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="mb-6 flex items-center text-gray-600 hover:text-gray-800"
            >
              <img
                src="/delivery-icon.png.png"
                alt="FastFab Logo"
                className="h-10 w-auto"
              />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Payment Status</h1>
            <div className="text-xs text-gray-500 mt-1">
              {user
                ? `Logged in as: ${
                    user.name || user.email || "Authenticated User"
                  }`
                : "Guest checkout"}
            </div>

            <div className="my-8">
              {loading ? (
                <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto" />
              ) : (
                renderStatusIcon()
              )}
            </div>

            <h2 className={`text-xl font-semibold ${statusDetails.textColor}`}>
              {statusDetails.title}
            </h2>

            <p className="mt-2 text-gray-600">{statusDetails.message}</p>

            {orderDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg w-full">
                <div className="text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">{orderDetails.order_id}</span>
                  </div>
                  {orderDetails.amount && orderDetails.amount !== "Unknown" && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        {orderDetails.currency} {orderDetails.amount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 space-y-3 w-full">
              {statusDetails.actionText && (
                <Link
                  href={statusDetails.actionUrl}
                  className="block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-center transition duration-200"
                >
                  {statusDetails.actionText}
                </Link>
              )}

              {statusDetails.showHomeButton && (
                <Link
                  href="/"
                  className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-center transition duration-200"
                >
                  <span className="flex items-center justify-center">
                    <FaHome className="mr-2" /> Return to Home
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} FastFab. All rights reserved.
      </footer>
    </div>
  );
}
