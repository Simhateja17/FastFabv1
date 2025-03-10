"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import { BsCart, BsPerson } from "react-icons/bs";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    return paths.map((path, index) => ({
      title: path.charAt(0).toUpperCase() + path.slice(1),
      href: `/${paths.slice(0, index + 1).join("/")}`,
    }));
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - visible on all screens */}
          <Link href="/" className="text-xl font-medium">
            Fast&Fab
          </Link>

          {/* Desktop Navigation Items */}
          <div className="hidden sm:flex sm:items-center sm:gap-4">
            <Link
              href="/seller/signup"
              className="text-[#C17867] border border-[#C17867] px-4 py-1.5 rounded-md hover:bg-[#C17867] hover:text-white transition-colors text-sm"
            >
              Become a Seller
            </Link>
            <Link href="/cart" className="text-gray-600 hover:text-gray-900">
              <BsCart className="w-6 h-6" />
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">
              <BsPerson className="w-6 h-6" />
            </Link>
          </div>

          {/* Mobile Navigation */}

          {/* Menu Button - Only visible on mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            {isMenuOpen ? (
              <FiX className="w-6 h-6" />
            ) : (
              <FiMenu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/seller/signup"
              className="block pl-3 pr-4 py-2 text-base font-medium text-[#C17867] hover:bg-gray-50"
            >
              Become a Seller
            </Link>
            <Link
              href="/cart"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            >
              Cart
            </Link>
            <Link
              href="/profile"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            >
              Profile
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
