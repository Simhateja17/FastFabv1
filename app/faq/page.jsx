"use client";

import Link from "next/link";
import { FiHelpCircle, FiChevronRight } from "react-icons/fi";
import { Suspense } from "react";

export default function FAQPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <FAQPageContent />
    </Suspense>
  );
}

function FAQPageContent() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-secondary to-secondary-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full mb-6 text-secondary">
              <FiHelpCircle size={32} />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl max-w-3xl mx-auto opacity-90">
              Find answers to commonly asked questions about Fast&Fab
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
            <span className="text-text-dark">FAQ</span>
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
                Last updated: <span className="font-medium">March 2024</span>
              </p>
            </div>

            {/* General Questions */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  1
                </span>
                General Questions
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    What is Fast&Fab?
                  </h3>
                  <p className="mt-2">
                    Fast&Fab is a{" "}
                    <span className="font-medium">
                      fashion quick commerce marketplace
                    </span>{" "}
                    that delivers trendy clothing and accessories{" "}
                    <span className="font-medium">within 30 minutes</span>.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    How does Fast&Fab work?
                  </h3>
                  <p className="mt-2">
                    Simply browse, select, and order fashion items through our
                    platform, and we ensure delivery in{" "}
                    <span className="font-medium">just 30 minutes</span>!
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Where does Fast&Fab operate?
                  </h3>
                  <p className="mt-2">
                    Currently, Fast&Fab is an{" "}
                    <span className="font-medium">
                      online-only platform in India
                    </span>
                    . We are expanding rapidly.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    How is Fast&Fab different from other fashion marketplaces?
                  </h3>
                  <p className="mt-2">
                    Unlike traditional platforms that take days to deliver,
                    Fast&Fab ensures you get your fashion essentials{" "}
                    <span className="font-medium">instantly</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* Orders & Delivery */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  2
                </span>
                Orders & Delivery
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    How fast is Fast&Fab&apos;s delivery?
                  </h3>
                  <p className="mt-2">
                    We guarantee delivery within{" "}
                    <span className="font-medium">30 minutes</span> in select
                    cities. Some areas might have slightly longer delivery
                    times.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Can I track my order?
                  </h3>
                  <p className="mt-2">
                    Yes! You&apos;ll receive a tracking link via SMS or email
                    after placing your order.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Can I cancel my order after placing it?
                  </h3>
                  <p className="mt-2">
                    🚫{" "}
                    <span className="font-medium">
                      No, order cancellation is not allowed
                    </span>{" "}
                    once the order is placed, as we process it immediately for
                    fast delivery.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    What if my order is delayed?
                  </h3>
                  <p className="mt-2">
                    If your order isn&apos;t delivered within{" "}
                    <span className="font-medium">30 minutes</span>, you can
                    contact our support team for assistance.
                  </p>
                </div>
              </div>
            </section>

            {/* Payments & Refunds */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  3
                </span>
                Payments & Refunds
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    What payment methods do you accept?
                  </h3>
                  <p className="mt-2">
                    We accept{" "}
                    <span className="font-medium">
                      UPI, debit/credit cards, wallets, and Cash on Delivery
                      (COD)
                    </span>{" "}
                    in select locations.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    How do refunds work?
                  </h3>
                  <p className="mt-2">
                    Refunds for prepaid orders are processed{" "}
                    <span className="font-medium">
                      only for returned or defective products
                    </span>{" "}
                    within{" "}
                    <span className="font-medium">3-5 business days</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* Returns & Exchanges */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  4
                </span>
                Returns & Exchanges
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Can I return or exchange an item?
                  </h3>
                  <p className="mt-2">
                    Yes, we offer{" "}
                    <span className="font-medium">
                      easy returns and exchanges within 7 days
                    </span>{" "}
                    of delivery for eligible products.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    What items are not eligible for return?
                  </h3>
                  <p className="mt-2">
                    Items like{" "}
                    <span className="font-medium">
                      innerwear, accessories, or discounted products
                    </span>{" "}
                    may not be eligible due to hygiene and policy reasons.
                  </p>
                </div>
              </div>
            </section>

            {/* Seller & Business Related */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  5
                </span>
                Seller & Business Related
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    How can I sell my products on Fast&Fab?
                  </h3>
                  <p className="mt-2">
                    Interested sellers can apply through our{" "}
                    <span className="font-medium">
                      &quot;Sell on Fast&Fab&quot;
                    </span>{" "}
                    portal. We review applications and onboard sellers quickly.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    What commission does Fast&Fab charge sellers?
                  </h3>
                  <p className="mt-2">
                    We charge a competitive commission based on product
                    categories. Contact our seller support team for exact
                    details.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Does Fast&Fab support bulk orders?
                  </h3>
                  <p className="mt-2">
                    🚫{" "}
                    <span className="font-medium">
                      No, Fast&Fab does not process bulk orders.
                    </span>{" "}
                    We focus on fast fashion delivery for individual customers.
                  </p>
                </div>
              </div>
            </section>

            {/* Contact Support */}
            <section className="mt-12">
              <div className="bg-background-alt rounded-lg p-6 border border-ui-border">
                <h2 className="text-xl font-semibold text-primary mb-2">
                  Still have questions?
                </h2>
                <p className="text-text">
                  Our support team is here to help! Contact us through our
                  support portal or email us at{" "}
                  <a
                    href="mailto:support@fastandfab.in"
                    className="text-secondary hover:text-secondary-dark font-medium underline"
                  >
                    support@fastandfab.in
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
