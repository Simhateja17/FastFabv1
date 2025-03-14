"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiMenu, FiX, FiLogOut, FiUser, FiShoppingBag } from "react-icons/fi";
import { BsCart, BsPerson } from "react-icons/bs";
import { useAuth } from "../context/AuthContext";
import { useUserAuth } from "../context/UserAuthContext";
import Image from "next/image";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const {
    seller,
    logout: sellerLogout,
    checkAuth: checkSellerAuth,
  } = useAuth();
  const { user, logout: userLogout } = useUserAuth();
  const sellerDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  const redirect = seller ? `/seller/dashboard` : "/";

  // Check authentication status on component mount
  useEffect(() => {
    const verifyAuth = async () => {
      await checkSellerAuth();
    };
    verifyAuth();
  }, [checkSellerAuth]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sellerDropdownRef.current &&
        !sellerDropdownRef.current.contains(event.target)
      ) {
        setIsSellerDropdownOpen(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSellerLogout = () => {
    sellerLogout();
    setIsSellerDropdownOpen(false);
    router.push("/");
  };

  const handleUserLogout = () => {
    userLogout();
    setIsUserDropdownOpen(false);
    router.push("/");
  };

  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    return paths.map((path, index) => ({
      title: path.charAt(0).toUpperCase() + path.slice(1),
      href: `/${paths.slice(0, index + 1).join("/")}`,
    }));
  };

  const renderUserAuthLinks = () => {
    if (user) {
      return (
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center space-x-1 text-text hover:text-primary"
          >
            <BsPerson className="text-xl" />
            <span className="hidden md:inline">{user.name || "Account"}</span>
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-background-card rounded-md shadow-lg py-1 z-10">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-text hover:bg-background-alt"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                My Profile
              </Link>
              <Link
                href="/orders"
                className="block px-4 py-2 text-sm text-text hover:bg-background-alt"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                My Orders
              </Link>
              <button
                onClick={handleUserLogout}
                className="block w-full text-left px-4 py-2 text-sm text-text hover:bg-background-alt"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-4">
        <Link href="/signin" className="text-text hover:text-primary">
          Login
        </Link>
        <Link
          href="/signup"
          className="hidden md:block bg-primary text-primary px-4 py-2 rounded-md hover:bg-primary-dark"
        >
          Sign Up
        </Link>
      </div>
    );
  };

  return (
    <nav className="bg-background-card shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - visible on all screens */}
          <Link href={`${redirect}`} className="text-xl font-medium">
            <Image
              src="/logo.svg"
              alt="Fast&Fab Logo"
              width={100}
              height={30}
              className="m-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {!seller && (
              <Link
                href="/seller/signup"
                className="text-text-muted hover:text-text-dark"
              >
                Become a Seller
              </Link>
            )}

            {/* User Authentication Links */}
            {renderUserAuthLinks()}
            <Link href="/cart" className="text-text-muted hover:text-text-dark">
              <BsCart className="w-6 h-6" />
            </Link>

            {/* Seller Profile with Dropdown */}
            <div className="relative" ref={sellerDropdownRef}>
              <button
                onClick={() => setIsSellerDropdownOpen(!isSellerDropdownOpen)}
                className="text-text-muted hover:text-text-dark focus:outline-none"
              >
                <BsPerson className="w-6 h-6" />
              </button>

              {/* Dropdown Menu */}
              {isSellerDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background-card rounded-md shadow-lg py-1 z-10 border border-ui-border">
                  {seller ? (
                    <>
                      <Link
                        href="/seller/profile"
                        className="px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
                      >
                        <FiUser className="mr-2" />
                        My Profile
                      </Link>
                      <Link
                        href="/seller/products"
                        className=" px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
                      >
                        <FiUser className="mr-2" />
                        My Products
                      </Link>
                      <button
                        onClick={handleSellerLogout}
                        className=" w-full text-left px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
                      >
                        <FiLogOut className="mr-2" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/seller/signin"
                      className="block px-4 py-2 text-sm text-text hover:bg-background-alt"
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
            className="sm:hidden text-text-muted hover:text-text-dark focus:outline-none"
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
        <div className="sm:hidden border-t border-ui-border">
          <div className="pt-2 pb-3 space-y-1">
            {!seller && (
              <Link
                href="/seller/signup"
                className="block pl-3 pr-4 py-2 text-base font-medium text-secondary hover:bg-background-alt"
              >
                Become a Seller
              </Link>
            )}
            <Link
              href="/cart"
              className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
            >
              Cart
            </Link>

            {/* User Authentication Links for Mobile */}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  My Orders
                </Link>
                <button
                  onClick={handleUserLogout}
                  className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  User Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Seller Authentication Links for Mobile */}
            {seller ? (
              <>
                <Link
                  href="/seller/profile"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  Seller Profile
                </Link>
                <Link
                  href="/seller/products"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  My Products
                </Link>
                <button
                  onClick={handleSellerLogout}
                  className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
                >
                  Seller Logout
                </button>
              </>
            ) : (
              <Link
                href="/seller/signin"
                className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
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
