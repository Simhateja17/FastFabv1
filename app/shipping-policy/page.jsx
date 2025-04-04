"use client";

import Link from "next/link";
import Image from "next/image";

export default function ShippingPolicy() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-secondary text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Shipping Policy</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Fast delivery for your fashion needs
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
          <div className="p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                1. Lightning-Fast Delivery
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Need your outfit ASAP? We&apos;ve got you covered! Your order
                  will be delivered within 30 minutes, so you&apos;ll never have
                  to wait long to style up.
                </p>
                <div className="bg-background p-4 rounded-lg border border-ui-border mt-4">
                  <div className="flex items-center">
                    <div className="bg-secondary rounded-full p-2 mr-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-dark">
                        30-Minute Delivery Promise
                      </h3>
                      <p className="text-text-muted">
                        We&apos;re committed to getting your fashion to you
                        quickly
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                2. Delivery Coverage
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Our 30-minute delivery service is currently available in
                  select areas of Hyderabad. During checkout, you&apos;ll be
                  able to see if your location qualifies for our express
                  delivery service.
                </p>
                <p className="text-text">
                  We&apos;re constantly expanding our coverage area to serve
                  more customers with our lightning-fast delivery.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                3. Delivery Hours
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Our delivery service operates from 10:00 AM to 8:00 PM, seven
                  days a week. Orders placed outside of these hours will be
                  delivered the next day.
                </p>
                <p className="text-text">
                  During peak times or special sale events, delivery times may
                  be slightly extended. We&apos;ll always keep you informed
                  about the status of your order.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                4. Delivery Charges
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  A nominal delivery fee applies to all orders. The exact fee
                  will be displayed during checkout before you confirm your
                  purchase.
                </p>
                <p className="text-text">
                  <strong>Important:</strong> The delivery fee is
                  non-refundable. Once an order is shipped, the delivery charge
                  will not be refunded, even if the item is returned.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                5. Order Tracking
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Once your order is confirmed, you&apos;ll receive real-time
                  updates about your delivery status via SMS and in-app
                  notifications. You can also track your order&apos;s progress
                  through your account dashboard.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                6. Returns
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Changed your mind? No worries! For returnable items, you have
                  1 day from the delivery date to request a return or exchange.
                  Please ensure the item is unworn, unwashed, and in its
                  original condition.
                </p>
                <p className="text-text">
                  For more details about our return process, please refer to our{" "}
                  <Link
                    href="/returns-refunds"
                    className="text-secondary hover:underline"
                  >
                    Returns & Refunds Policy
                  </Link>
                  .
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                7. Contact Us
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  For any questions or assistance regarding your delivery, feel
                  free to contact our support team at{" "}
                  <a
                    href="mailto:simhateja@fastandfab.in"
                    className="text-secondary hover:underline"
                  >
                    simhateja@fastandfab.in
                  </a>
                  .
                </p>
              </div>
            </section>

            <div className="mt-10 text-center">
              <p className="text-text-muted mb-4">
                Last updated: March 13th, 2025
              </p>
              <Link
                href="/"
                className="inline-block bg-secondary text-white px-8 py-3 rounded-md hover:bg-secondary-dark transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
