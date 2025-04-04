import React from 'react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <div className="bg-gradient-to-r from-primary to-primary-dark text-white">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 text-center md:text-left mb-8 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Fashion That Defines Your Style
            </h1>
            <p className="text-xl mb-8 max-w-lg">
              Shop the latest trends with Fast & Fab - your destination for premium clothing at affordable prices.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link
                href="/products"
                className="bg-white text-primary px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/products/category/new-arrivals"
                className="bg-transparent border-2 border-white px-8 py-3 rounded-md font-medium hover:bg-white hover:text-primary transition-colors"
              >
                New Arrivals
              </Link>
            </div>
          </div>
          <div className="md:w-1/2">
            <div className="relative">
              {/* Placeholder for hero image - in a real app, use Next.js Image component */}
              <div className="bg-white bg-opacity-20 rounded-lg h-80 w-full">
                {/* You can replace this div with an actual image */}
                <div className="flex items-center justify-center h-full">
                  <span className="text-xl font-medium">Hero Image</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 