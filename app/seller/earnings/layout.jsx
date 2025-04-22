"use client";

import { Suspense } from "react";

export default function SellerEarningsLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    }>
      {children}
    </Suspense>
  );
}