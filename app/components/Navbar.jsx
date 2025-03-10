"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import { BsCart, BsPerson } from "react-icons/bs";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { seller, logout, checkAuth } = useAuth();
  const dropdownRef = useRef(null);

  const redirect = seller ? `/seller/dashboard` : "/";

  // Check authentication status on component mount
  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth();
    };
    verifyAuth();
  }, [checkAuth]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    router.push("/");
  };

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
          <Link href={`${redirect}`} className="text-xl font-medium">
            Fast&Fab
          </Link>

          {/* Desktop Navigation Items */}
          <div className="hidden sm:flex sm:items-center sm:gap-4">
            {!seller && (
              <Link
                href="/seller/signup"
                className="text-[#C17867] border border-[#C17867] px-4 py-1.5 rounded-md hover:bg-[#C17867] hover:text-white transition-colors text-sm"
              >
                Become a Seller
              </Link>
            )}
            <Link href="/cart" className="text-gray-600 hover:text-gray-900">
              <BsCart className="w-6 h-6" />
            </Link>

            {/* User Profile with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <BsPerson className="w-6 h-6" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                  {seller ? (
                    <>
                      <Link
                        href="/seller/profile"
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FiUser className="mr-2" />
                        My Profile
                      </Link>
                      <Link
                        href="/seller/products"
                        className=" px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FiUser className="mr-2" />
                        My Products
                      </Link>
                      <button
                        onClick={handleLogout}
                        className=" w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FiLogOut className="mr-2" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/seller/signin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Seller Login
                    </Link>
                  )}
                </div>
              )}
            </div>
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
            {!seller && (
              <Link
                href="/seller/signup"
                className="block pl-3 pr-4 py-2 text-base font-medium text-[#C17867] hover:bg-gray-50"
              >
                Become a Seller
              </Link>
            )}
            <Link
              href="/cart"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            >
              Cart
            </Link>
            {seller ? (
              <>
                <Link
                  href="/seller/products"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                >
                  My Products
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/seller/login"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              >
                Seller Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
