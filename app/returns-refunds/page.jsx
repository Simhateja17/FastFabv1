"use client";

import Link from "next/link";
import Image from "next/image";
import { FiChevronRight, FiArrowLeft, FiRefreshCw } from "react-icons/fi";

export default function ReturnsAndRefunds() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-secondary to-secondary-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full mb-6 text-secondary">
              <FiRefreshCw size={32} />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Returns & Refunds Policy
            </h1>
            <p className="text-xl max-w-3xl mx-auto opacity-90">
              At Fast&Fab, we want you to shop with confidence
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
            <span className="text-text-dark">Returns & Refunds</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-card rounded-lg shadow-md overflow-hidden border border-ui-border">
          <div className="p-8">
            {/* Last Updated Info */}
            <div className="mb-8 pb-6 border-b border-ui-border">
              <p className="text-text-muted text-sm">
                Effective Date:{" "}
                <span className="font-medium">March 13th, 2025</span>
              </p>
            </div>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  1
                </span>
                Returns & Refunds for Eligible Orders
              </h2>
              <div className="space-y-4 ml-11">
                <p className="text-text">
                  For purchases that are eligible for returns:
                </p>
                <ul className="list-disc pl-6 space-y-3 text-text">
                  <li>
                    <span className="font-medium text-text-dark">
                      Return Window:
                    </span>{" "}
                    You can request a return within one (1) day from the date of
                    delivery.
                  </li>
                  <li>
                    <span className="font-medium text-text-dark">
                      Return Process:
                    </span>{" "}
                    Once your return request is approved, our delivery partner
                    will pick up the item within 24 hours.
                  </li>
                  <li>
                    <span className="font-medium text-text-dark">
                      Refund Processing:
                    </span>{" "}
                    Once the returned item is received and inspected at our
                    warehouse, we will initiate the refund.
                  </li>
                  <li>
                    <span className="font-medium text-text-dark">
                      Delivery Charge:
                    </span>{" "}
                    The delivery fee is non-refundable. Once an order is
                    shipped, the delivery charge will not be refunded, even if
                    the item is returned.
                  </li>
                  <li>
                    <span className="font-medium text-text-dark">
                      Refund Timeline:
                    </span>{" "}
                    Refunds are typically credited to your original payment
                    method within 5–7 business days, depending on your bank or
                    payment provider.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  2
                </span>
                Non-Returnable Items
              </h2>
              <div className="space-y-4 ml-11">
                <p className="text-text">
                  Some items may not be eligible for return. Please check the
                  product page before purchasing to see if an item is marked as
                  &quot;non-returnable.&quot;
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  3
                </span>
                Important Notes
              </h2>
              <div className="space-y-4 ml-11">
                <ul className="list-disc pl-6 space-y-3 text-text">
                  <li>
                    <span className="font-medium text-text-dark">
                      Refund Method:
                    </span>{" "}
                    Refunds will always be credited back to the original payment
                    method used at checkout.
                  </li>
                  <li>
                    <span className="font-medium text-text-dark">
                      Condition of Returns:
                    </span>{" "}
                    Items must be returned in their original condition, with all
                    tags and packaging intact.
                  </li>
                  <li>
                    <span className="font-medium text-text-dark">
                      Refund Confirmation:
                    </span>{" "}
                    You will receive an email confirmation once your refund has
                    been processed.
                  </li>
                  <li>
                    <span className="font-medium text-text-dark">
                      Delivery Charge:
                    </span>{" "}
                    The delivery fee is non-refundable. Once an order is
                    shipped, the delivery charge will not be refunded, even if
                    the item is returned.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  4
                </span>
                Need Assistance?
              </h2>
              <div className="space-y-4 ml-11">
                <p className="text-text">
                  If you have any questions regarding your return or refund,
                  please contact us at{" "}
                  <a
                    href="mailto:simhateja@fastandfab.in"
                    className="text-secondary hover:text-secondary-dark font-medium underline"
                  >
                    simhateja@fastandfab.in
                  </a>{" "}
                  with your order details. Our team is available to assist you.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  5
                </span>
                Cancellation Policy
              </h2>
              <div className="space-y-4 ml-11">
                <p className="text-text">
                  Once an order is placed, it cannot be canceled. We process
                  orders immediately to ensure fast delivery, so cancellations
                  are not possible. Please review your order carefully before
                  confirming your purchase.
                </p>
              </div>
            </section>

            <div className="bg-background-alt p-6 rounded-lg mb-8 ml-11">
              <p className="text-text-muted">
                This policy may be updated from time to time to ensure
                compliance and enhance customer experience.
              </p>
            </div>

            <div className="mt-12 pt-6 border-t border-ui-border text-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center bg-secondary hover:bg-secondary-dark text-white px-6 py-3 rounded-md transition-colors"
              >
                <FiArrowLeft className="mr-2" /> Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
