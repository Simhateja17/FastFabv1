"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// Metadata is moved to a separate file since it can't be exported from a client component

export default function SellerOnboardingLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    }>
      <div className="min-h-screen bg-[#faf9f8]">
        <div className="max-w-7xl mx-auto">
          {/* Logo section */}
          <div className="py-8 text-center">
            <h1 className="text-2xl font-semibold text-[#8B6E5A]">Fast&Fab</h1>
            <p className="text-gray-600 mt-2">Seller Onboarding</p>
          </div>

          {/* Main content */}
          {children}
        </div>
      </div>
    </Suspense>
  );
}
