"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiShoppingBag } from "react-icons/fi";

export default function NotFound() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="text-center">
        <div className="bg-secondary bg-opacity-10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiShoppingBag className="h-12 w-12 text-secondary" />
        </div>
        
        <h1 className="text-9xl font-bold text-secondary">404</h1>
        
        <h2 className="mt-6 text-2xl font-semibold text-text-dark">Page Not Found</h2>
        
        <p className="mt-4 text-text-muted max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. 
          Please check the URL or return to our homepage.
        </p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border border-ui-border rounded-md hover:bg-background-alt transition-colors flex items-center justify-center"
          >
            <FiArrowLeft className="mr-2" /> Go Back
          </button>
          
          <Link
            href="/"
            className="px-6 py-3 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors"
          >
            Back to Home
          </Link>
        </div>
        
        <div className="mt-16">
          <p className="text-sm text-text-muted">
            Need help? <Link href="/contact" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
} 