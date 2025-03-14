"use client";

import Link from "next/link";
import Image from "next/image";

export default function ReturnsAndRefunds() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-secondary text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Returns & Refunds Policy</h1>
          <p className="text-xl max-w-3xl mx-auto">
            At Fast&Fab, we want you to shop with confidence
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
          <div className="p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                1. Returns & Refunds for Eligible Orders
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  For purchases that are eligible for returns:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-text">
                  <li>
                    <span className="font-medium">Return Window:</span> You can
                    request a return within one (1) day from the date of
                    delivery.
                  </li>
                  <li>
                    <span className="font-medium">Return Process:</span> Once
                    your return request is approved, our delivery partner will
                    pick up the item within 24 hours.
                  </li>
                  <li>
                    <span className="font-medium">Refund Processing:</span> Once
                    the returned item is received and inspected at our
                    warehouse, we will initiate the refund.
                  </li>
                  <li>
                    <span className="font-medium">Delivery Charge:</span> The
                    delivery fee is non-refundable. Once an order is shipped,
                    the delivery charge will not be refunded, even if the item
                    is returned.
                  </li>
                  <li>
                    <span className="font-medium">Refund Timeline:</span>{" "}
                    Refunds are typically credited to your original payment
                    method within 5–7 business days, depending on your bank or
                    payment provider.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                2. Non-Returnable Items
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Some items may not be eligible for return. Please check the
                  product page before purchasing to see if an item is marked as
                  "non-returnable."
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                3. Important Notes
              </h2>
              <div className="space-y-4">
                <ul className="list-disc pl-6 space-y-2 text-text">
                  <li>
                    <span className="font-medium">Refund Method:</span> Refunds
                    will always be credited back to the original payment method
                    used at checkout.
                  </li>
                  <li>
                    <span className="font-medium">Condition of Returns:</span>{" "}
                    Items must be returned in their original condition, with all
                    tags and packaging intact.
                  </li>
                  <li>
                    <span className="font-medium">Refund Confirmation:</span>{" "}
                    You will receive an email confirmation once your refund has
                    been processed.
                  </li>
                  <li>
                    <span className="font-medium">Delivery Charge:</span> The
                    delivery fee is non-refundable. Once an order is shipped,
                    the delivery charge will not be refunded, even if the item
                    is returned.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                4. Need Assistance?
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  If you have any questions regarding your return or refund,
                  please contact us at{" "}
                  <a
                    href="mailto:simhateja@fastandfab.in"
                    className="text-secondary hover:underline"
                  >
                    simhateja@fastandfab.in
                  </a>{" "}
                  with your order details. Our team is available to assist you.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                5. Cancellation Policy
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Once an order is placed, it cannot be canceled. We process
                  orders immediately to ensure fast delivery, so cancellations
                  are not possible. Please review your order carefully before
                  confirming your purchase.
                </p>
              </div>
            </section>

            <div className="mt-10 text-center">
              <p className="text-text-muted mb-4">
                Effective Date: March 13th, 2025
              </p>
              <p className="text-text-muted mb-6">
                This policy may be updated from time to time to ensure
                compliance and enhance customer experience.
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
