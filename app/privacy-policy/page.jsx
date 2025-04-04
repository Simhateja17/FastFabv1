"use client";

import Link from "next/link";
import { FiChevronRight, FiArrowLeft, FiShield } from "react-icons/fi";
import { Suspense } from "react";

function PrivacyPolicyContent() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-secondary to-secondary-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full mb-6 text-secondary">
              <FiShield size={32} />
            </div>
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl max-w-3xl mx-auto opacity-90">
              We value your privacy and are committed to protecting your
              personal data
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
            <span className="text-text-dark">Privacy Policy</span>
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
              <div className="space-y-4 ml-11 text-text">
                <p>
                  This Privacy Policy explains how Fast&Fab (&quot;we&quot;,
                  &quot;us&quot;, or &quot;our&quot;) collects, uses, and
                  protects your personal information when you use our website or
                  services. We are committed to ensuring that your privacy is
                  protected.
                </p>
                <p>
                  By using our website, you agree to the collection and use of
                  information in accordance with this policy.
                </p>
                <p className="mt-2">
                  This Privacy Policy applies to all personal information
                  collected by us. By using our services, you consent to the
                  collection, use, storage, and disclosure of your personal
                  information in accordance with this Privacy Policy and as
                  otherwise permitted under the Privacy Act.
                </p>
                <p className="mt-2">
                  The terms &quot;we&quot;, &quot;us&quot;, &quot;our&quot; and
                  &quot;Fast&Fab&quot; refer to Fast&Fab, and the terms
                  &quot;you&quot; and &quot;your&quot; refer to our customers,
                  users, and visitors of the FastFab website.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  2
                </span>
                Information We Collect
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>We may collect the following information:</p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    Name and contact information including email address and
                    phone number
                  </li>
                  <li>
                    Demographic information such as address, postal code,
                    preferences, and interests
                  </li>
                  <li>Payment information for processing orders</li>
                  <li>
                    Other information relevant to customer surveys and/or offers
                  </li>
                  <li>
                    Information about your device and how you use our website
                  </li>
                </ul>
                <p className="mt-2">
                  When setting up and operating your Fast&apos;nFab account, we
                  collect personal information such as:
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  3
                </span>
                How We Use Your Information
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>We use your information for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>To process your orders and manage your account</li>
                  <li>To improve our products and services</li>
                  <li>
                    To send promotional emails about new products, special
                    offers, or other information we think you may find
                    interesting
                  </li>
                  <li>To customize the website according to your interests</li>
                  <li>To contact you for market research purposes</li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  4
                </span>
                Data Security
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>
                  We are committed to ensuring that your information is secure.
                  We have implemented suitable physical, electronic, and
                  managerial procedures to safeguard and secure the information
                  we collect online.
                </p>
                <p>
                  However, no method of transmission over the Internet or method
                  of electronic storage is 100% secure. While we strive to use
                  commercially acceptable means to protect your personal
                  information, we cannot guarantee its absolute security.
                </p>
                <p className="mt-2">
                  For security and verification purposes, we may record and
                  track details of your visits to our platform. We may monitor
                  traffic patterns, site usage, and related information to
                  optimize your experience. We also use &quot;cookies&quot; and
                  &quot;web beacons&quot; to remember your preferences.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  5
                </span>
                Your Rights
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of your personal information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to processing of your personal information</li>
                  <li>
                    Request restriction of processing your personal information
                  </li>
                  <li>Request transfer of your personal information</li>
                  <li>
                    Withdraw consent where we rely on consent to process your
                    personal information
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  6
                </span>
                Cookies and Tracking Technologies
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>
                  We use cookies and similar tracking technologies to track
                  activity on our website and hold certain information. Cookies
                  are files with small amounts of data which may include an
                  anonymous unique identifier.
                </p>
                <p>
                  You can instruct your browser to refuse all cookies or to
                  indicate when a cookie is being sent. However, if you do not
                  accept cookies, you may not be able to use some portions of
                  our website.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  7
                </span>
                Children&apos;s Privacy
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>
                  Our website is not intended for children under the age of 18.
                  We do not knowingly collect personal information from children
                  under 18. If you are a parent or guardian and you are aware
                  that your child has provided us with personal information,
                  please contact us.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  8
                </span>
                Changes to This Privacy Policy
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>
                  We may update our Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the &quot;Last updated&quot; date.
                </p>
                <p>
                  You are advised to review this Privacy Policy periodically for
                  any changes. Changes to this Privacy Policy are effective when
                  they are posted on this page.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  9
                </span>
                Contact Us
              </h2>
              <div className="space-y-4 ml-11 text-text">
                <p>
                  If you have any questions about this Privacy Policy, please
                  contact us at{" "}
                  <a
                    href="mailto:simhateja@fastandfab.in"
                    className="text-secondary hover:text-secondary-dark font-medium underline"
                  >
                    simhateja@fastandfab.in
                  </a>
                </p>
              </div>
            </section>

            <div className="bg-background-alt p-6 rounded-lg mb-8 ml-11">
              <p className="text-text-muted">
                This privacy policy is regularly reviewed to ensure compliance
                with current data protection regulations.
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

export default function PrivacyPolicy() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PrivacyPolicyContent />
    </Suspense>
  );
}
