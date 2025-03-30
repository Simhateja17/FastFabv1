"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiMenu,
  FiX,
  FiLogOut,
  FiUser,
  FiShoppingBag,
  FiMapPin,
  FiPackage,
  FiSettings,
  FiHeart,
} from "react-icons/fi";
import { BsPerson } from "react-icons/bs";
import { useAuth } from "../context/AuthContext";
import { useUserAuth } from "../context/UserAuthContext";
import Image from "next/image";
import { USER_ENDPOINTS } from "@/app/config";
import { useContext } from "react";
import { LocationContext } from "@/app/context/LocationContext";
import dynamic from "next/dynamic";

// Dynamically import the LocationModal component with SSR disabled
// This ensures it's only loaded client-side when needed
const LocationModal = dynamic(() => import("./LocationModal"), {
  ssr: false,
});

// User Avatar Component
const UserAvatar = ({ user }) => (
  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
    {user?.name ? user.name.charAt(0).toUpperCase() : <BsPerson />}
  </div>
);

// User Dropdown Component
const UserDropdown = ({
  user,
  isOpen,
  setIsOpen,
  onLogout,
  userDropdownRef,
}) => (
  <div className="relative" ref={userDropdownRef}>
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center space-x-1 text-text hover:text-primary"
    >
      <UserAvatar user={user} />
      <span className="hidden md:inline ml-2">{user?.name || "Account"}</span>
    </button>

    {isOpen && (
      <div className="absolute right-0 mt-2 w-56 bg-background-card rounded-md shadow-lg py-1 z-10 border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">
            {user?.name || "User"}
          </p>
          <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
        </div>

        <Link
          href="/profile"
          className=" px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <FiUser className="mr-2 text-gray-500" />
          My Profile
        </Link>

        <Link
          href="/orders"
          className=" px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <FiPackage className="mr-2 text-gray-500" />
          My Orders
        </Link>

        <Link
          href="/address"
          className=" px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <FiMapPin className="mr-2 text-gray-500" />
          My Addresses
        </Link>

        <Link
          href="/wishlist"
          className=" px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <FiHeart className="mr-2 text-gray-500" />
          Wishlist
        </Link>

        <Link
          href="/settings"
          className=" px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <FiSettings className="mr-2 text-gray-500" />
          Settings
        </Link>

        <div className="border-t border-gray-100 mt-1"></div>

        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center text-red-600"
        >
          <FiLogOut className="mr-2" />
          Logout
        </button>
      </div>
    )}
  </div>
);

// Login/Signup Links Component
const AuthLinks = () => (
  <div className="flex items-center space-x-4">
    <Link
      href="/signup"
      className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
    >
      Login/Signup
    </Link>
  </div>
);

// Seller Dropdown Component
const SellerDropdown = ({
  seller,
  isOpen,
  setIsOpen,
  onLogout,
  sellerDropdownRef,
}) => (
  <div className="relative" ref={sellerDropdownRef}>
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="text-text-muted hover:text-text-dark focus:outline-none"
    >
      <BsPerson className="w-6 h-6" />
    </button>

    {isOpen && (
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
              className="px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
            >
              <FiUser className="mr-2" />
              My Products
            </Link>
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2 text-sm text-text hover:bg-background-alt flex items-center"
            >
              <FiLogOut className="mr-2" />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/seller/signin"
              className="block px-4 py-2 text-sm text-text hover:bg-background-alt"
            >
              Seller Login
            </Link>
            <Link
              href="/admin-login"
              className="block px-4 py-2 text-sm text-text hover:bg-background-alt"
            >
              Admin Login
            </Link>
          </>
        )}
      </div>
    )}
  </div>
);

// Mobile Menu Component
const MobileMenu = ({ isOpen, seller, user, onUserLogout, onSellerLogout }) => {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="md:hidden border-t border-ui-border">
      <div className="pt-2 pb-3 space-y-1">
        <Link
          href="/products"
          className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
        >
          Products
        </Link>

        {!seller && (
          <Link
            href="/seller/signup"
            className="block pl-3 pr-4 py-2 text-base font-medium text-secondary hover:bg-background-alt"
          >
            Become a Seller
          </Link>
        )}

        <Link
          href="/contact-us"
          className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
        >
          Contact Us
        </Link>

        {/* User Authentication Links for Mobile */}
        {!seller && !user && (
          <>
            <Link
              href="/signup"
              className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
            >
              Login/Signup
            </Link>
          </>
        )}

        {/* User Profile Links - only when user is logged in */}
        {!seller && user && (
          <>
            <div className="border-t border-gray-200 pt-4 my-2"></div>
            <div className="px-4 py-2 flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3">
                {user.name ? user.name.charAt(0).toUpperCase() : <BsPerson />}
              </div>
              <div>
                <div className="font-medium">{user.name || "User"}</div>
                <div className="text-xs text-gray-500">{user.email || ""}</div>
              </div>
            </div>
            <Link
              href="/profile"
              className="pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt flex items-center"
            >
              <FiUser className="mr-2" />
              My Profile
            </Link>
            <Link
              href="/orders"
              className="pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt flex items-center"
            >
              <FiPackage className="mr-2" />
              My Orders
            </Link>
            <Link
              href="/address"
              className="pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt flex items-center"
            >
              <FiMapPin className="mr-2" />
              My Addresses
            </Link>
            <Link
              href="/wishlist"
              className="pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt flex items-center"
            >
              <FiHeart className="mr-2" />
              Wishlist
            </Link>
            <Link
              href="/settings"
              className="pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt flex items-center"
            >
              <FiSettings className="mr-2" />
              Settings
            </Link>
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={onUserLogout}
              className="w-full text-left pl-3 pr-4 py-2 text-base font-medium text-red-500 hover:bg-background-alt flex items-center"
            >
              <FiLogOut className="mr-2" />
              Logout
            </button>
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
              onClick={onSellerLogout}
              className="w-full text-left pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/seller/signin"
              className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
            >
              Seller Login
            </Link>
            <Link
              href="/admin-login"
              className="block pl-3 pr-4 py-2 text-base font-medium text-text-muted hover:text-text-dark hover:bg-background-alt"
            >
              Admin Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

// Main Navbar Component
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("Select Location");
  const [previousAuthState, setPreviousAuthState] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    seller,
    logout: sellerLogout,
    checkAuth: checkSellerAuth,
  } = useAuth();
  const { user, logout: userLogout, authStateChange } = useUserAuth();
  const sellerDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  console.log("Navbar rendered - User state:", user);
  console.log("Auth state change counter:", authStateChange);
  console.log("Current pathname:", pathname);

  const redirect = seller ? `/seller/dashboard` : "/";

  // Check authentication status on component mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (typeof checkSellerAuth === "function") {
        await checkSellerAuth();
      }
    };
    verifyAuth();

    console.log("Navbar useEffect - User auth state:", user);

    // Reset dropdown states when user auth changes
    if (user) {
      console.log("User authenticated, updating navbar state");
    } else {
      console.log("User not authenticated or logged out");
    }

    // Close any open mobile menu when auth state changes
    setIsMenuOpen(false);
  }, [checkSellerAuth, user]); // Include user in dependencies
  
  // Open location modal when user logs in or signs up
  useEffect(() => {
    // Check if user just logged in (previousAuthState was null and now user exists)
    if (!previousAuthState && user) {
      console.log("User just logged in, showing location modal");
      
      // Short delay to ensure UI has settled
      const timer = setTimeout(() => {
        setIsLocationModalOpen(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    // Update previous auth state
    setPreviousAuthState(user);
  }, [user, previousAuthState]);
  
  // Also check pathname changes to detect signup/login page redirects
  useEffect(() => {
    // Check if we just arrived from a login or signup page
    if (user && (pathname === "/" || pathname === "/products") && 
        (localStorage.getItem("justLoggedIn") === "true")) {
      
      console.log("Detected login/signup redirect, showing location modal");
      setIsLocationModalOpen(true);
      
      // Clear the flag
      localStorage.removeItem("justLoggedIn");
    }
  }, [pathname, user]);

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
    console.log("User logout called");
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

  return (
    <>
      <nav className="bg-background-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Location - visible on all screens */}
            <div className="flex items-center">
              <Link href={`${redirect}`} className="text-xl font-medium">
                <Image
                  src="/logo.svg"
                  alt="Fast&Fab Logo"
                  width={100}
                  height={30}
                  className="m-auto"
                />
              </Link>
              
              {/* Clickable Location display with icon */}
              <div 
                className="ml-4 text-text-muted hover:text-text-dark flex items-center cursor-pointer"
                onClick={() => setIsLocationModalOpen(true)}
                data-location-trigger
              >
                <FiMapPin className="mr-1" />
                <span>{currentLocation}</span>
                <svg 
                  className="ml-1 w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 9l-7 7-7-7" 
                  />
                </svg>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-6">
              <Link
                href="/products"
                className="text-text-muted hover:text-text-dark"
              >
                Products
              </Link>

              {!seller && (
                <Link
                  href="/seller/signup"
                  className="text-text-muted hover:text-text-dark"
                >
                  Become a Seller
                </Link>
              )}

              <Link
                href="/contact-us"
                className="text-text-muted hover:text-text-dark"
              >
                Contact Us
              </Link>

              {/* User Authentication - Either show profile or login/signup */}
              {!seller &&
                (user ? (
                  <UserDropdown
                    user={user}
                    isOpen={isUserDropdownOpen}
                    setIsOpen={setIsUserDropdownOpen}
                    onLogout={handleUserLogout}
                    userDropdownRef={userDropdownRef}
                  />
                ) : (
                  <AuthLinks />
                ))}

              {/* Seller Profile with Dropdown */}
              <SellerDropdown
                seller={seller}
                isOpen={isSellerDropdownOpen}
                setIsOpen={setIsSellerDropdownOpen}
                onLogout={handleSellerLogout}
                sellerDropdownRef={sellerDropdownRef}
              />
            </div>

            {/* Mobile Navigation Menu Button */}
            <div className="flex items-center md:hidden">
              {/* User profile icon in mobile view */}
              {!seller && user && (
                <div className="mr-4" onClick={() => router.push("/profile")}>
                  <UserAvatar user={user} />
                </div>
              )}

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-text-muted hover:text-text-dark focus:outline-none"
              >
                {isMenuOpen ? (
                  <FiX className="w-6 h-6" />
                ) : (
                  <FiMenu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={isMenuOpen}
          seller={seller}
          user={user}
          onUserLogout={handleUserLogout}
          onSellerLogout={handleSellerLogout}
        />
      </nav>

      {/* Location Selection Modal */}
      {isLocationModalOpen && (
        <LocationModal 
          isOpen={isLocationModalOpen} 
          onClose={() => setIsLocationModalOpen(false)}
          setCurrentLocation={setCurrentLocation}
        />
      )}
    </>
  );
};

export default Navbar;
