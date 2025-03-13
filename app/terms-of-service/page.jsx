"use client";

import Link from "next/link";
import Image from "next/image";

export default function TermsAndConditions() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-secondary text-primary">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Please read these terms carefully before using our services
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
          <div className="p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                1. Introduction
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  1.1. These terms and conditions govern your use of Fast&Fab, a
                  fashion marketplace platform provided by Couture Services
                  Private Limited, located in Rajampet, Andhra Pradesh, India.
                </p>
                <p className="text-text">
                  1.2. By using our website, you accept these terms and
                  conditions in full. If you disagree with any part of these
                  terms, do not use our website.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                2. Use of the Website
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  2.1. You must be at least 18 years old to use our website. By
                  accessing our website, you confirm that you meet this
                  requirement.
                </p>
                <p className="text-text">
                  2.2. You agree to use the website for lawful purposes only and
                  in a manner that does not infringe on the rights of others.
                </p>
                <p className="text-text">
                  2.3. You must not introduce any harmful material such as
                  viruses, malware, or other malicious technology.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                3. Account Registration
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  3.1. Certain features may require you to create an account.
                  You agree to provide accurate and up-to-date information.
                </p>
                <p className="text-text">
                  3.2. You are responsible for maintaining the security of your
                  account.
                </p>
                <p className="text-text">
                  3.3. Notify us immediately of any unauthorized access to your
                  account.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                4. Orders and Payments
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  4.1. By placing an order through our website, you agree to
                  purchase the product subject to these terms.
                </p>
                <p className="text-text">
                  4.2. Orders are subject to availability and price
                  confirmation.
                </p>
                <p className="text-text">
                  4.3. We reserve the right to refuse any order at our
                  discretion.
                </p>
                <p className="text-text">
                  4.4. Prices may change without notice, and we may discontinue
                  products at any time.
                </p>
                <p className="text-text">
                  4.5. Payments must be made using available payment methods,
                  and you must provide accurate billing details.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                5. Delivery
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  5.1. We offer 30-minute delivery in Hyderabad.
                </p>
                <p className="text-text">
                  5.2. Delivery times may vary based on product availability and
                  location.
                </p>
                <p className="text-text">
                  5.3. We are not responsible for delays caused by factors
                  beyond our control.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                6. Returns and Refunds
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  6.1. Returns and refunds are processed according to our Return
                  and Refund Policy, available on our website.
                </p>
                <p className="text-text">
                  6.2. To initiate a return, contact our customer service team
                  within the return period.
                </p>
                <p className="text-text">
                  6.3. Products must be returned in original condition with tags
                  and packaging intact.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                7. Intellectual Property
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  7.1. All content on our website, including text, images,
                  logos, and software, belongs to Couture Services Private
                  Limited and is protected by copyright laws.
                </p>
                <p className="text-text">
                  7.2. You may not copy, sell, or exploit any part of our
                  website without permission.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                8. Limitation of Liability
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  8.1. To the fullest extent permitted by law, Fast&Fab shall
                  not be liable for any indirect or consequential damages
                  arising from the use of our website.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                9. Indemnity
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  9.1. You agree to indemnify and hold Couture Services Private
                  Limited harmless from any claims, losses, or damages resulting
                  from your use of the website.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                10. Modifications to Terms
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  10.1. We reserve the right to modify these terms at any time.
                  Changes will be posted on our website and take effect
                  immediately.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                11. Governing Law
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  11.1. These terms are governed by Indian law, and any disputes
                  shall be subject to the jurisdiction of courts in Andhra
                  Pradesh.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                12. Contact Us
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  12.1. If you have any questions about these terms, contact us
                  at{" "}
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
              <p className="text-text-muted mb-4">Last updated: June 2023</p>
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
