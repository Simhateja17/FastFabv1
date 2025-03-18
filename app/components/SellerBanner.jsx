"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiX, FiTrendingUp, FiPackage, FiAward } from "react-icons/fi";

const SellerBanner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef(null);
  const hasCheckedStorage = useRef(false);

  // Initialize banner state on mount only once
  useEffect(() => {
    if (hasCheckedStorage.current) return;

    const bannerClosed = localStorage.getItem("sellerBannerClosed");

    if (!bannerClosed) {
      // Delay showing the modal to prevent it from closing during initial renders/data fetching
      const timer = setTimeout(() => {
        setIsOpen(true);
        hasCheckedStorage.current = true;
      }, 1500); // 1.5 second delay

      return () => clearTimeout(timer);
    }

    hasCheckedStorage.current = true;
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  // Handle closing the banner
  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("sellerBannerClosed", "true");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-10"
          aria-label="Close"
        >
          <FiX className="h-6 w-6" />
        </button>

        {/* Left Column - Teal Background */}
        <div className="bg-secondary p-8 text-white text-center flex flex-col items-center justify-center md:w-2/5">
          <div className="mb-4 w-20 h-20 bg-white rounded-lg flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Fast&Fab Logo"
              width={50}
              height={50}
              className="m-auto"
            />
          </div>
          <h3 className="text-2xl font-bold mb-2">Fast&Fab</h3>
          <p className="font-medium">Start selling today!</p>
        </div>

        {/* Right Column - Content */}
        <div className="p-8 md:w-3/5">
          <h2 className="text-2xl font-bold text-primary mb-3">
            Become a Seller on Fast&Fab
          </h2>
          <p className="text-gray-600 mb-6">
            Join our marketplace and reach more customers with your fashion
            products.
          </p>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="mr-3 mt-1 text-secondary">
                <FiTrendingUp size={18} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Increase Your Sales</p>
                <p className="text-sm text-gray-600">
                  Get your products in front of our growing customer base
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="mr-3 mt-1 text-secondary">
                <FiPackage size={18} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Easy to Manage</p>
                <p className="text-sm text-gray-600">
                  Our seller dashboard makes inventory and order management
                  simple
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="mr-3 mt-1 text-secondary">
                <FiAward size={18} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Grow Your Brand</p>
                <p className="text-sm text-gray-600">
                  Build customer loyalty with our platform tools
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Link
              href="/seller/signup"
              className="py-2 px-6 bg-secondary text-white rounded-md text-center font-medium hover:bg-secondary-dark transition-colors"
            >
              Register as Seller
            </Link>
            <button
              onClick={handleClose}
              className="py-2 px-6 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Don't Show Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerBanner;
