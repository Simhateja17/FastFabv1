"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiArrowLeft, FiRefreshCw } from "react-icons/fi";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="text-center">
        <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiAlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-text-dark">Something went wrong</h1>
        
        <p className="mt-4 text-text-muted max-w-md mx-auto">
          We apologize for the inconvenience. An unexpected error has occurred.
          Our team has been notified and is working on a solution.
        </p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center justify-center"
          >
            <FiRefreshCw className="mr-2" /> Try Again
          </button>
          
          <Link
            href="/"
            className="px-6 py-3 border border-ui-border rounded-md hover:bg-background-alt transition-colors flex items-center justify-center"
          >
            <FiArrowLeft className="mr-2" /> Back to Home
          </Link>
        </div>
        
        <div className="mt-12 p-4 bg-background-alt rounded-lg max-w-lg mx-auto text-left">
          <h3 className="font-medium text-text-dark mb-2">Error Details:</h3>
          <p className="text-sm text-text-muted break-words">
            {error?.message || "Unknown error occurred"}
          </p>
        </div>
      </div>
    </div>
  );
} 