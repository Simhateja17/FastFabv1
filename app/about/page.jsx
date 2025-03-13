"use client";

import Link from "next/link";
import Image from "next/image";
import { FiClock, FiTruck, FiShoppingBag, FiThumbsUp } from "react-icons/fi";

export default function AboutUs() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-dark text-primary">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">About Us</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Fast&Fab – Instant Style, Instant confidence
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
          <div className="p-8">
            <p className="text-lg text-text mb-12">
              Why wait for fashion when you can have it now? Fast&Fab is
              Hyderabad's first ultra-fast fashion delivery service, designed
              for those who need style on demand. Whether it's a last-minute
              event, an unexpected plan, or just the urge to refresh your
              wardrobe, we bring the latest trends straight to your doorstep in
              just 30 minutes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <div className="bg-secondary-light p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <FiShoppingBag className="text-secondary text-3xl mr-4" />
                  <h2 className="text-2xl font-semibold text-primary">
                    Fashion Without the Wait
                  </h2>
                </div>
                <p className="text-text">
                  Trends move fast, and so do we! Our collection is constantly
                  updated with stylish, curated outfits that help you stand out.
                  Whether you're dressing up for a big night out or keeping it
                  casual, we make sure you always have the right look at the
                  right time.
                </p>
              </div>

              <div className="bg-secondary-light p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <FiClock className="text-secondary text-3xl mr-4" />
                  <h2 className="text-2xl font-semibold text-primary">
                    30-Minute Express Delivery
                  </h2>
                </div>
                <p className="text-text">
                  No more planning outfits days in advance—your fashion fix is
                  just a few clicks away. Browse our website, pick your
                  favorites, and get them delivered anywhere in Hyderabad in
                  just 30 minutes.
                </p>
              </div>
            </div>

            {/* Delivery Illustration */}
            <div className="flex justify-center mb-16">
              <div className="relative w-full max-w-2xl h-64">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-1 bg-secondary-light"></div>
                </div>
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-background-card p-2 rounded-full border-2 border-secondary">
                  <FiShoppingBag className="text-secondary text-3xl" />
                </div>
                <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2 bg-background-card p-2 rounded-full border-2 border-secondary">
                  <FiClock className="text-secondary text-3xl" />
                  <div className="absolute top-full mt-2 text-sm font-medium text-primary whitespace-nowrap">
                    Order Placed
                  </div>
                </div>
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background-card p-2 rounded-full border-2 border-secondary">
                  <FiTruck className="text-secondary text-3xl" />
                  <div className="absolute top-full mt-2 text-sm font-medium text-primary whitespace-nowrap">
                    On the Way
                  </div>
                </div>
                <div className="absolute right-1/4 top-1/2 transform translate-x-1/2 -translate-y-1/2 bg-background-card p-2 rounded-full border-2 border-secondary">
                  <FiThumbsUp className="text-secondary text-3xl" />
                  <div className="absolute top-full mt-2 text-sm font-medium text-primary whitespace-nowrap">
                    Delivered
                  </div>
                </div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-secondary text-white px-4 py-2 rounded-full text-sm font-bold">
                  30 Minutes
                </div>
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center mb-4">
                <FiThumbsUp className="text-secondary text-3xl mr-4" />
                <h2 className="text-2xl font-semibold text-primary">
                  Effortless Shopping, Zero Hassle
                </h2>
              </div>
              <p className="text-text">
                We make online shopping seamless and stress-free. No long wait
                times, no uncertainty—just instant access to the styles you
                love. With a smooth browsing experience and a one-tap checkout,
                getting your perfect outfit has never been easier.
              </p>
            </div>

            <div className="bg-secondary-light p-8 rounded-lg mb-12">
              <h2 className="text-2xl font-semibold text-primary mb-4 text-center">
                Ready to Upgrade Your Wardrobe?
              </h2>
              <p className="text-text mb-6 text-center">
                Stay stylish, stay spontaneous. Whether you need a bold new look
                or everyday essentials, Fast&Fab ensures you never have to wait
                for fashion.
              </p>
              <p className="text-xl font-medium text-text-dark text-center">
                Shop now and get your order in 30 minutes!
              </p>
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/"
                className="inline-block bg-secondary text-white px-8 py-3 rounded-md hover:bg-secondary-dark transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
