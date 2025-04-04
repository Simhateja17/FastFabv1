"use client";

import Link from "next/link";
import Image from "next/image";
import { FiChevronRight, FiFileText, FiArrowLeft } from "react-icons/fi";
import { Suspense } from "react";

function TermsAndConditionsContent() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-secondary to-secondary-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full mb-6 text-secondary">
              <FiFileText size={32} />
            </div>
            <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
            <p className="text-xl max-w-3xl mx-auto opacity-90">
              Please read these terms carefully before using our services
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
            <span className="text-text-dark">Terms and Conditions</span>
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
                Last updated: <span className="font-medium">June 2023</span>
              </p>
            </div>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  1
                </span>
                Introduction
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  1.1. These terms and conditions govern your use of Fast&Fab, a
                  fashion marketplace platform provided by Couture Services
                  Private Limited, located in Rajampet, Andhra Pradesh, India.
                </p>
                <p>
                  1.2. By using our website, you accept these terms and
                  conditions in full. If you disagree with any part of these
                  terms, do not use our website.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  2
                </span>
                Use of the Website
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  2.1. You must be at least 18 years old to use our website. By
                  accessing our website, you confirm that you meet this
                  requirement.
                </p>
                <p>
                  2.2. You agree to use the website for lawful purposes only and
                  in a manner that does not infringe on the rights of others.
                </p>
                <p>
                  2.3. You must not introduce any harmful material such as
                  viruses, malware, or other malicious technology.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  3
                </span>
                Account Registration
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  3.1. Certain features may require you to create an account.
                  You agree to provide accurate and up-to-date information.
                </p>
                <p>
                  3.2. You are responsible for maintaining the security of your
                  account.
                </p>
                <p>
                  3.3. Notify us immediately of any unauthorized access to your
                  account.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  4
                </span>
                Orders and Payments
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  4.1. By placing an order through our website, you agree to
                  purchase the product subject to these terms.
                </p>
                <p>
                  4.2. Orders are subject to availability and price
                  confirmation.
                </p>
                <p>
                  4.3. We reserve the right to refuse any order at our
                  discretion.
                </p>
                <p>
                  4.4. Prices may change without notice, and we may discontinue
                  products at any time.
                </p>
                <p>
                  4.5. Payments must be made using available payment methods,
                  and you must provide accurate billing details.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  5
                </span>
                Delivery
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>5.1. We offer 30-minute delivery in Hyderabad.</p>
                <p>
                  5.2. Delivery times may vary based on product availability and
                  location.
                </p>
                <p>
                  5.3. We are not responsible for delays caused by factors
                  beyond our control.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  6
                </span>
                Returns and Refunds
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  6.1. Returns and refunds are processed according to our Return
                  and Refund Policy, available on our website.
                </p>
                <p>
                  6.2. To initiate a return, contact our customer service team
                  within the return period.
                </p>
                <p>
                  6.3. Products must be returned in original condition with tags
                  and packaging intact.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  7
                </span>
                Intellectual Property
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  7.1. All content on our website, including text, images,
                  logos, and software, belongs to Couture Services Private
                  Limited and is protected by copyright laws.
                </p>
                <p>
                  7.2. You may not copy, sell, or exploit any part of our
                  website without permission.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  8
                </span>
                Limitation of Liability
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  8.1. To the fullest extent permitted by law, Fast&Fab shall
                  not be liable for any indirect or consequential damages
                  arising from the use of our website.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  9
                </span>
                Indemnity
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  9.1. You agree to indemnify and hold Couture Services Private
                  Limited harmless from any claims, losses, or damages resulting
                  from your use of the website.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  10
                </span>
                Modifications to Terms
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  10.1. We reserve the right to modify these terms at any time.
                  Changes will be posted on our website and take effect
                  immediately.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  11
                </span>
                Governing Law
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  11.1. These terms are governed by Indian law, and any disputes
                  shall be subject to the jurisdiction of courts in Andhra
                  Pradesh.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  12
                </span>
                Contact Us
              </h2>
              <div className="space-y-4 text-text ml-11">
                <p>
                  12.1. If you have any questions about these terms, contact us
                  at{" "}
                  <a
                    href="mailto:simhateja@fastandfab.in"
                    className="text-secondary hover:text-secondary-dark font-medium underline"
                  >
                    simhateja@fastandfab.in
                  </a>
                  .
                </p>
              </div>
            </section>

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

export default function TermsAndConditions() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <TermsAndConditionsContent />
    </Suspense>
  );
}
