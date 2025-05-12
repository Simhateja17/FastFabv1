"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PriceAdjustment from '@/app/components/admin/PriceAdjustment';

export default function PriceAdjustmentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Just a simple loading effect
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PriceAdjustment />
    </div>
  );
} 