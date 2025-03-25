"use client";

import { FiHelpCircle } from "react-icons/fi";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <FiHelpCircle className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-4xl font-bold text-gray-900">
            Fast&Fab - Frequently Asked Questions (FAQ)
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Find answers to commonly asked questions about Fast&Fab
          </p>
        </div>

        {/* FAQ Content */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 sm:p-8 space-y-8">
            {/* General Questions */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-6">
                General Questions
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    1. What is Fast&Fab?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Fast&Fab is a{" "}
                    <span className="font-medium">
                      fashion quick commerce marketplace
                    </span>{" "}
                    that delivers trendy clothing and accessories{" "}
                    <span className="font-medium">within 30 minutes</span>.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    2. How does Fast&Fab work?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Simply browse, select, and order fashion items through our
                    platform, and we ensure delivery in{" "}
                    <span className="font-medium">just 30 minutes</span>!
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    3. Where does Fast&Fab operate?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Currently, Fast&Fab is an{" "}
                    <span className="font-medium">
                      online-only platform in India
                    </span>
                    . We are expanding rapidly.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    4. How is Fast&Fab different from other fashion
                    marketplaces?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Unlike traditional platforms that take days to deliver,
                    Fast&Fab ensures you get your fashion essentials{" "}
                    <span className="font-medium">instantly</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* Orders & Delivery */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-6">
                Orders & Delivery
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    5. How fast is Fast&Fab's delivery?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    We guarantee delivery within{" "}
                    <span className="font-medium">30 minutes</span> in select
                    cities. Some areas might have slightly longer delivery
                    times.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    6. Can I track my order?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Yes! You'll receive a tracking link via SMS or email after
                    placing your order.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    7. Can I cancel my order after placing it?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    🚫{" "}
                    <span className="font-medium">
                      No, order cancellation is not allowed
                    </span>{" "}
                    once the order is placed, as we process it immediately for
                    fast delivery.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    8. What if my order is delayed?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    If your order isn't delivered within{" "}
                    <span className="font-medium">30 minutes</span>, you can
                    contact our support team for assistance.
                  </p>
                </div>
              </div>
            </section>

            {/* Payments & Refunds */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-6">
                Payments & Refunds
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    9. What payment methods do you accept?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    We accept{" "}
                    <span className="font-medium">
                      UPI, debit/credit cards, wallets, and Cash on Delivery
                      (COD)
                    </span>{" "}
                    in select locations.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    10. How do refunds work?
                  </h3>
                  <p className="mt-2 text-gray-600">
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
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-6">
                Returns & Exchanges
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    11. Can I return or exchange an item?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Yes, we offer{" "}
                    <span className="font-medium">
                      easy returns and exchanges within 7 days
                    </span>{" "}
                    of delivery for eligible products.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    12. What items are not eligible for return?
                  </h3>
                  <p className="mt-2 text-gray-600">
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
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-6">
                Seller & Business Related
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    13. How can I sell my products on Fast&Fab?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Interested sellers can apply through our{" "}
                    <span className="font-medium">"Sell on Fast&Fab"</span>{" "}
                    portal. We review applications and onboard sellers quickly.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    14. What commission does Fast&Fab charge sellers?
                  </h3>
                  <p className="mt-2 text-gray-600">
                    We charge a competitive commission based on product
                    categories. Contact our seller support team for exact
                    details.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    15. Does Fast&Fab support bulk orders?
                  </h3>
                  <p className="mt-2 text-gray-600">
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
            <section className="mt-12 text-center">
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Still have questions?
                </h2>
                <p className="mt-2 text-gray-600">
                  Our support team is here to help! Contact us through our
                  support portal or email us at{" "}
                  <a
                    href="mailto:support@fastandfab.in"
                    className="text-primary hover:text-primary-dark"
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
