"use client";

import { Suspense } from "react";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function MenCategoryLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="secondary" />
      </div>
    }>
      {children}
    </Suspense>
  );
} 