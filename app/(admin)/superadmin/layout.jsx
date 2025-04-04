"use client";

import { Suspense } from "react";

export default function SuperAdminLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    }>
      {children}
    </Suspense>
  );
} 