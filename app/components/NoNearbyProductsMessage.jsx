"use client";

import Image from 'next/image';
import { FiMapPin, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';

export default function NoNearbyProductsMessage({ radius = 3 }) {
  return (
    <div className="w-full py-8 px-4 flex flex-col items-center justify-center">
      <div className="mb-6 relative w-60 h-60">
        <Image 
          src="/images/no-sellers-nearby.svg" 
          alt="No nearby sellers"
          fill
          className="object-contain"
        />
      </div>
      
      <h2 className="text-2xl font-bold text-center mb-2">
        No Sellers Nearby
      </h2>
      
      <div className="flex items-center justify-center mb-4">
        <FiMapPin className="text-primary mr-2" />
        <p className="text-text-muted">
          Within {radius} km of your location
        </p>
      </div>
      
      <p className="text-center text-text mb-6 max-w-md">
        We&apos;re expanding our network of sellers in your area. Please check back soon or try increasing your search radius.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          href="/products"
          className="px-6 py-3 bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition-colors"
        >
          Browse All Products
        </Link>
        
        <button
          onClick={() => document.querySelector('[data-location-trigger]')?.click()}
          className="px-6 py-3 border border-primary text-primary rounded-md hover:bg-primary-light/10 transition-colors"
        >
          Change Location
        </button>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 max-w-md">
        <div className="flex items-start">
          <FiAlertCircle className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            We&apos;re rapidly expanding! If you know local sellers who might be interested in joining our platform, please let them know about us.
          </p>
        </div>
      </div>
    </div>
  );
} 