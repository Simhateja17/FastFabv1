"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function PaymentStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const paymentId = searchParams.get("payment_id");

    if (!orderId || !paymentId) {
      setStatus("error");
      return;
    }

    // Verify payment status
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/verify-payment?order_id=${orderId}&payment_id=${paymentId}`);
        const data = await response.json();

        if (response.ok && data.status === "success") {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          {status === "success" ? (
            <>
              <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-gray-600 mb-6">
                Your order has been placed successfully.
              </p>
            </>
          ) : (
            <>
              <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
              <p className="text-gray-600 mb-6">
                There was an issue processing your payment. Please try again.
              </p>
            </>
          )}
          
          <button
            onClick={() => router.push("/orders")}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            View Orders
          </button>
        </div>
      </div>
    </div>
  );
}
