"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUserAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    setLoading(false);
  }, [authLoading, user, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-4 text-lg text-gray-500">
            Please complete your purchase through our secure checkout process.
          </p>
        </div>
      </div>
    </div>
  );
}
