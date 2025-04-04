"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { DashboardHeader } from "./DashboardHeader";

// Metadata is moved to a separate file or handled differently
// since it can't be exported from a client component

export default function SellerDashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#faf9f8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardHeader />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </div>
    </ProtectedRoute>
  );
}
