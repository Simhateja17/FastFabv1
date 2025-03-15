"use client";

import { useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function SellerTermsModal({ isOpen, onClose, onAccept }) {
  const [isChecked, setIsChecked] = useState(false);
  const modalRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-background-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-ui-border">
          <h2 className="text-xl font-semibold text-primary">Terms of Use</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-dark"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-grow">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-text-muted mb-4">
              Last Updated: 14-03-2025
            </p>

            <p className="mb-4">
              Welcome to Fast&Fab! These Terms and Conditions ("Terms") govern
              your use of our platform as a seller. By registering as a seller,
              you agree to comply with these Terms. Please read them carefully
              before proceeding.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">1. Eligibility</h3>
            <p className="ml-4 mb-2">
              1.1 You must be at least 18 years old and legally capable of
              entering into contracts.
            </p>
            <p className="ml-4 mb-2">
              1.2 You must provide accurate business and tax details as required
              by applicable laws.
            </p>
            <p className="ml-4 mb-2">
              1.3 Fast&Fab reserves the right to approve or reject seller
              applications at its sole discretion.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              2. Seller Account & Responsibilities
            </h3>
            <p className="ml-4 mb-2">
              2.1 You are responsible for maintaining the security of your
              account credentials.
            </p>
            <p className="ml-4 mb-2">
              2.2 You must ensure that all product listings are accurate,
              complete, and not misleading.
            </p>
            <p className="ml-4 mb-2">
              2.3 You agree to comply with all applicable laws, including
              consumer protection, intellectual property, and taxation laws.
            </p>
            <p className="ml-4 mb-2">
              2.4 You must fulfill all orders promptly and provide tracking
              details where applicable.
            </p>
            <p className="ml-4 mb-2">
              2.5 You are solely responsible for resolving disputes with
              customers regarding your products and services.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              3. Product Listings & Prohibited Items
            </h3>
            <p className="ml-4 mb-2">
              3.1 All products listed must comply with Fast&Fab's guidelines and
              policies.
            </p>
            <p className="ml-4 mb-2">
              3.2 The following products are strictly prohibited:
            </p>
            <ul className="list-disc ml-8 mb-2">
              <li>Counterfeit or unauthorized goods</li>
              <li>Illegal, hazardous, or restricted items</li>
              <li>Products that violate intellectual property rights</li>
              <li>Any other items deemed inappropriate by Fast&Fab</li>
            </ul>
            <p className="ml-4 mb-2">
              3.3 Fast&Fab reserves the right to remove any listings that
              violate these Terms.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              4. Payments & Fees
            </h3>
            <p className="ml-4 mb-2">
              4.1 Sellers will receive payments based on the agreed commission
              structure or pricing model.
            </p>
            <p className="ml-4 mb-2">
              4.2 Fast&Fab may charge service fees, transaction fees, and other
              applicable charges.
            </p>
            <p className="ml-4 mb-2">
              4.3 Payments will be processed according to the schedule and
              method specified in the seller dashboard.
            </p>
            <p className="ml-4 mb-2">
              4.4 Sellers are responsible for any applicable taxes related to
              their sales.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              5. Shipping & Returns
            </h3>
            <p className="ml-4 mb-2">
              5.1 Sellers must use reliable shipping methods and provide
              accurate shipping estimates.
            </p>
            <p className="ml-4 mb-2">
              5.2 You must honor Fast&Fab's return and refund policies and
              process returns in a timely manner.
            </p>
            <p className="ml-4 mb-2">
              5.3 Any disputes regarding shipping damages or delivery failures
              must be resolved by the seller.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              6. Intellectual Property
            </h3>
            <p className="ml-4 mb-2">
              6.1 You grant Fast&Fab a non-exclusive, royalty-free license to
              use your product images and descriptions for promotional purposes.
            </p>
            <p className="ml-4 mb-2">
              6.2 Sellers must not infringe on any third-party intellectual
              property rights.
            </p>
            <p className="ml-4 mb-2">
              6.3 Fast&Fab may remove any content that is found to be
              infringing.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              7. Compliance & Penalties
            </h3>
            <p className="ml-4 mb-2">
              7.1 Sellers must adhere to all Fast&Fab policies, including fair
              business practices and customer service standards.
            </p>
            <p className="ml-4 mb-2">
              7.2 Violation of these Terms may result in penalties, including
              suspension or termination of your seller account.
            </p>
            <p className="ml-4 mb-2">
              7.3 Fast&Fab reserves the right to withhold payments if fraudulent
              activity is suspected.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">8. Termination</h3>
            <p className="ml-4 mb-2">
              8.1 Either party may terminate this agreement with prior notice.
            </p>
            <p className="ml-4 mb-2">
              8.2 Upon termination, sellers must fulfill any outstanding orders
              and obligations.
            </p>
            <p className="ml-4 mb-2">
              8.3 Any outstanding dues must be settled before account closure.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              9. Limitation of Liability
            </h3>
            <p className="ml-4 mb-2">
              9.1 Fast&Fab is not liable for any losses, damages, or disputes
              arising from your use of the platform.
            </p>
            <p className="ml-4 mb-2">
              9.2 We do not guarantee sales, visibility, or success for any
              seller.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              10. Modifications to Terms
            </h3>
            <p className="ml-4 mb-2">
              10.1 Fast&Fab reserves the right to update or modify these Terms
              at any time.
            </p>
            <p className="ml-4 mb-2">
              10.2 Continued use of the platform after changes constitutes
              acceptance of the new Terms.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              11. Governing Law & Disputes
            </h3>
            <p className="ml-4 mb-2">
              11.1 These Terms shall be governed by the laws of India.
            </p>
            <p className="ml-4 mb-2">
              11.2 Any disputes shall be resolved through arbitration or legal
              proceedings in the jurisdiction of courts in Telangana.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ui-border">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="accept-terms"
              checked={isChecked}
              onChange={() => setIsChecked(!isChecked)}
              className="h-4 w-4 text-primary border-ui-border rounded focus:ring-primary"
            />
            <label htmlFor="accept-terms" className="ml-2 text-sm text-text">
              I accept and agree to the{" "}
              <span className="text-primary">Terms of Use</span>.
            </label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 mr-2 border border-ui-border rounded-md text-text-dark hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!isChecked}
              className="px-4 py-2 bg-secondary text-primary rounded-md hover:bg-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
