"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FiCheckCircle, FiXCircle, FiArrowLeft } from "react-icons/fi";

export default function PaymentStatus() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("cf_payment_id");
  const txStatus = searchParams.get("txStatus");

  useEffect(() => {
    const syncAuthState = async () => {
      if (typeof window === "undefined") return;

      try {
        const accessToken = localStorage.getItem("accessToken");
        const userDataStr = localStorage.getItem("user");

        if (accessToken && userDataStr) {
          const userData = JSON.parse(userDataStr);
          console.log(
            "Ensuring user stays logged in on payment status page:",
            userData?.name || "Anonymous user"
          );

          if (!user && accessToken) {
            console.log(
              "Forced login to maintain session on payment status page"
            );
            if (login && typeof login === "function") {
              await login({ accessToken, user: userData });
            }
          }
        }

        const paymentSession = localStorage.getItem("payment_session");
        if (paymentSession) {
          const sessionData = JSON.parse(paymentSession);
          console.log(
            "Found payment session with auth data:",
            sessionData?.auth
          );

          if (sessionData?.auth?.isAuthenticated && !user && !accessToken) {
            console.log("Attempting to restore auth from payment session");
          }
        }
      } catch (error) {
        console.error("Error syncing auth state:", error);
      }
    };

    syncAuthState();
  }, [user, login]);

  useEffect(() => {
    async function verifyPayment() {
      if (!orderId) {
        router.push("/");
        return;
      }

      setLoading(true);

      try {
        const accessToken = localStorage.getItem("accessToken");
        const headers = {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

        const response = await fetch(
          `/api/verify-payment?order_id=${orderId}&payment_id=${
            paymentId || ""
          }`,
          { headers }
        );

        if (!response.ok) {
          throw new Error("Failed to verify payment status");
        }

        const data = await response.json();

        setStatus(data.payment_status || txStatus || "PENDING");
        setOrderDetails(
          data.order_details || {
            order_id: orderId,
            amount: "N/A",
            currency: "INR",
          }
        );
      } catch (error) {
        console.error("Payment verification error:", error);
        // If the API call fails, fallback to URL params
        setStatus(txStatus || "UNKNOWN");
        setOrderDetails({
          order_id: orderId,
          amount: "N/A",
          currency: "INR",
        });
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [orderId, paymentId, txStatus, router]);

  const renderStatusContent = () => {
    if (loading) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying payment status...</p>
        </div>
      );
    }

    // Successful payment
    if (status === "SUCCESS") {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <FiCheckCircle className="text-green-500 w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-green-600 mb-4">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-2">
            Your payment for order #{orderDetails.order_id} has been
            successfully processed.
          </p>
          <p className="text-gray-600 mb-8">
            Amount: ₹{orderDetails.amount || "N/A"} {orderDetails.currency}
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors"
            >
              <FiArrowLeft className="mr-2" /> Continue Shopping
            </Link>
          </div>
        </div>
      );
    }

    // Failed payment
    if (status === "FAILED" || status === "CANCELLED") {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <FiXCircle className="text-red-500 w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-red-600 mb-4">
            Payment Failed
          </h2>
          <p className="text-gray-600 mb-8">
            Your payment for order #{orderDetails.order_id} could not be
            processed.
            {status === "CANCELLED" ? " The transaction was cancelled." : ""}
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href={`/checkout?order_id=${orderId}`}
              className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              <FiArrowLeft className="mr-2" /> Back to Home
            </Link>
          </div>
        </div>
      );
    }

    // Pending or unknown status
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-12 h-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-yellow-600 mb-4">
          Payment Pending
        </h2>
        <p className="text-gray-600 mb-8">
          We&apos;re still verifying your payment for order #
          {orderDetails.order_id}. You&apos;ll be notified once the status is
          confirmed.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors"
          >
            <FiArrowLeft className="mr-2" /> Back to Home
          </Link>
        </div>
      </div>
    );
  };

  return renderStatusContent();
}

// Main component with Suspense boundary
export default function PaymentStatus() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.svg"
              alt="Fast&Fab Logo"
              width={200}
              height={60}
            />
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {renderStatusContent()}
        </div>
      </div>
    </div>
  );
}
