"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  FiClock,
  FiTruck,
  FiShoppingBag,
  FiThumbsUp,
  FiChevronRight,
  FiArrowLeft,
  FiInfo,
} from "react-icons/fi";

function AboutUsContent() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-secondary to-secondary-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full mb-6 text-secondary">
              <FiInfo size={32} />
            </div>
            <h1 className="text-4xl font-bold mb-4">About Us</h1>
            <p className="text-xl max-w-3xl mx-auto opacity-90">
              Fast&Fab – Instant Style, Instant confidence
            </p>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-background-alt border-b border-ui-border">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm text-text-muted">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <FiChevronRight className="mx-2" />
            <span className="text-text-dark">About Us</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-card rounded-lg shadow-md overflow-hidden border border-ui-border">
          <div className="p-8">
            <div className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  <FiInfo size={16} />
                </span>
                Our Story
              </h2>
              <p className="text-lg text-text ml-11">
                Why wait for fashion when you can have it now? Fast&Fab is
                Hyderabad&apos;s first ultra-fast fashion delivery service,
                designed for those who need style on demand. Whether it&apos;s a
                last-minute event, an unexpected plan, or just the urge to
                refresh your wardrobe, we bring the latest trends straight to
                your doorstep in just 30 minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 ml-11">
              <div className="bg-background-alt p-6 rounded-lg border border-ui-border shadow-sm">
                <div className="flex items-center mb-4">
                  <FiShoppingBag className="text-secondary text-xl mr-3" />
                  <h3 className="text-xl font-semibold text-primary">
                    Fashion Without the Wait
                  </h3>
                </div>
                <p className="text-text">
                  Trends move fast, and so do we! Our collection is constantly
                  updated with stylish, curated outfits that help you stand out.
                  Whether you&apos;re dressing up for a big night out or keeping
                  it casual, we make sure you always have the right look at the
                  right time.
                </p>
              </div>

              <div className="bg-background-alt p-6 rounded-lg border border-ui-border shadow-sm">
                <div className="flex items-center mb-4">
                  <FiClock className="text-secondary text-xl mr-3" />
                  <h3 className="text-xl font-semibold text-primary">
                    30-Minute Express Delivery
                  </h3>
                </div>
                <p className="text-text">
                  No more planning outfits days in advance—your fashion fix is
                  just a few clicks away. Browse our website, pick your
                  favorites, and get them delivered anywhere in Hyderabad in
                  just 30 minutes.
                </p>
              </div>
            </div>

            {/* Delivery Illustration with updated styling */}
            <div className="mb-16 ml-11">
              <h3 className="text-xl font-semibold text-primary mb-6">
                Our Delivery Process
              </h3>
              <div className="relative w-full max-w-2xl h-64 mx-auto bg-background-alt p-6 rounded-lg border border-ui-border shadow-sm">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-1 bg-secondary-light"></div>
                </div>
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-md border border-secondary">
                  <FiShoppingBag className="text-secondary text-2xl" />
                </div>
                <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-md border border-secondary">
                  <FiClock className="text-secondary text-2xl" />
                  <div className="absolute top-full mt-3 text-sm font-medium text-text-dark whitespace-nowrap">
                    Order Placed
                  </div>
                </div>
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-md border border-secondary">
                  <FiTruck className="text-secondary text-2xl" />
                  <div className="absolute top-full mt-3 text-sm font-medium text-text-dark whitespace-nowrap">
                    On the Way
                  </div>
                </div>
                <div className="absolute right-1/4 top-1/2 transform translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-md border border-secondary">
                  <FiThumbsUp className="text-secondary text-2xl" />
                  <div className="absolute top-full mt-3 text-sm font-medium text-text-dark whitespace-nowrap">
                    Delivered
                  </div>
                </div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-secondary text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                  30 Minutes
                </div>
              </div>
            </div>

            <div className="mb-12 ml-11">
              <div className="flex items-start mb-4">
                <FiThumbsUp className="text-secondary text-xl mt-1 mr-3" />
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-2">
                    Effortless Shopping, Zero Hassle
                  </h3>
                  <p className="text-text">
                    We make online shopping seamless and stress-free. No long
                    wait times, no uncertainty—just instant access to the styles
                    you love. With a smooth browsing experience and a one-tap
                    checkout, getting your perfect outfit has never been easier.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-secondary-light to-secondary-light/50 p-8 rounded-lg shadow-sm mb-12 ml-11">
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

            <div className="mt-12 pt-6 border-t border-ui-border text-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center bg-secondary hover:bg-secondary-dark text-white px-6 py-3 rounded-md transition-colors"
              >
                <FiArrowLeft className="mr-2" /> Back to Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutUs() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
      </div>
    }>
      <AboutUsContent />
    </Suspense>
  );
}
