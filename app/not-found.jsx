"use client";

import Link from "next/link";
import { Suspense } from "react";

export default function NotFound() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <NotFoundContent />
    </Suspense>
  );
}

function NotFoundContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-gray-700">Page Not Found</h2>
      <p className="mt-2 text-gray-600 max-w-md text-center">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
} 