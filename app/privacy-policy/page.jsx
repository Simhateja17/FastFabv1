"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-secondary text-primary">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl max-w-3xl mx-auto">
            We value your privacy and are committed to protecting your personal
            data
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
                  This Privacy Policy explains how Fast&Fab ("we", "us", or
                  "our") collects, uses, and protects your personal information
                  when you use our website or services. We are committed to
                  ensuring that your privacy is protected.
                </p>
                <p className="text-text">
                  By using our website, you agree to the collection and use of
                  information in accordance with this policy.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                2. Information We Collect
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  We may collect the following information:
                </p>
                <ul className="list-disc pl-6 text-text space-y-2">
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
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                3. How We Use Your Information
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  We use your information for the following purposes:
                </p>
                <ul className="list-disc pl-6 text-text space-y-2">
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

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                4. Data Security
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  We are committed to ensuring that your information is secure.
                  We have implemented suitable physical, electronic, and
                  managerial procedures to safeguard and secure the information
                  we collect online.
                </p>
                <p className="text-text">
                  However, no method of transmission over the Internet or method
                  of electronic storage is 100% secure. While we strive to use
                  commercially acceptable means to protect your personal
                  information, we cannot guarantee its absolute security.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                5. Your Rights
              </h2>
              <div className="space-y-4">
                <p className="text-text">You have the right to:</p>
                <ul className="list-disc pl-6 text-text space-y-2">
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

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                6. Cookies and Tracking Technologies
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  We use cookies and similar tracking technologies to track
                  activity on our website and hold certain information. Cookies
                  are files with small amounts of data which may include an
                  anonymous unique identifier.
                </p>
                <p className="text-text">
                  You can instruct your browser to refuse all cookies or to
                  indicate when a cookie is being sent. However, if you do not
                  accept cookies, you may not be able to use some portions of
                  our website.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                7. Children's Privacy
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  Our website is not intended for children under the age of 18.
                  We do not knowingly collect personal information from children
                  under 18. If you are a parent or guardian and you are aware
                  that your child has provided us with personal information,
                  please contact us.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                8. Changes to This Privacy Policy
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  We may update our Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the "Last updated" date.
                </p>
                <p className="text-text">
                  You are advised to review this Privacy Policy periodically for
                  any changes. Changes to this Privacy Policy are effective when
                  they are posted on this page.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                9. Contact Us
              </h2>
              <div className="space-y-4">
                <p className="text-text">
                  If you have any questions about this Privacy Policy, please
                  contact us at{" "}
                  <a
                    href="mailto:simhateja@fastandfab.in"
                    className="text-secondary hover:underline"
                  >
                    simhateja@fastandfab.in
                  </a>
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
