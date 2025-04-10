"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  FiSearch,
  FiTruck,
} from "react-icons/fi";
import { BsPerson } from "react-icons/bs";
import { useAuth } from "../context/AuthContext";
import { useUserAuth } from "../context/UserAuthContext";
import Image from "next/image";
import { USER_ENDPOINTS } from "@/app/config";
import { useContext } from "react";
import { LocationContext } from "@/app/context/LocationContext";
import dynamic from "next/dynamic";
import { useLocationStore } from "@/app/lib/locationStore";

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
      className="bg-white text-black px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium text-sm shadow-sm hover:shadow-md flex items-center space-x-2 z-50 border border-gray-200"
      style={{ position: 'relative', display: 'flex' }}
    >
      <BsPerson className="w-5 h-5" />
      <span>Login/Signup</span>
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

        <div className="flex items-center pl-3 pr-4 py-2">
          <div className="flex items-center bg-white">
            <Image 
              src="/delivery-icon.png.png" 
              alt="Fast Delivery" 
              width={55} 
              height={55}
              className="mx-1"
              style={{ backgroundColor: "white", objectFit: "contain" }}
            />
          </div>
        </div>

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

// Original Navbar component renamed to NavbarContent
function NavbarContent() {
  const { seller, setSeller } = useAuth();
  const { user, authStateChange, logout } = useUserAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const sellerDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  
  // Location state and modal
  const { userLocation, isLocationSet } = useLocationStore();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Search state and debounce ref
  const [searchInputValue, setSearchInputValue] = useState("");
  const debounceTimeoutRef = useRef(null);

  const isAdminRoute = pathname.startsWith("/admin");
  const isSellerRoute = pathname.startsWith("/seller");

  // Derive current location label
  const currentLocation = useLocationStore((state) => state.userLocation?.label || "Select Location");

  // Add effect to debug user auth state changes
  useEffect(() => {
    console.log("Navbar auth state updated:", { 
      user: user ? `${user.name} (${user.id})` : 'null',
      authStateChange
    });
  }, [user, authStateChange]); 

  // Redirect URL for logo click
  const redirect = isSellerRoute
    ? "/seller/dashboard"
    : isAdminRoute
    ? "/admin/dashboard"
    : "/";

  // Sync search input value with URL search param on load/change
  useEffect(() => {
    const currentSearch = searchParams.get('search') || "";
    setSearchInputValue(currentSearch);
  }, [searchParams]);

  // Effect to handle debounced search URL update
  useEffect(() => {
    // Clear timeout on component unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchInputChange = (event) => {
    const newValue = event.target.value;
    setSearchInputValue(newValue);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout to update URL after 300ms
    debounceTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      const oldSearchValue = params.get('search') || '';
      
      // Only update if the search term has actually changed
      if (newValue.trim() !== oldSearchValue) {
        if (newValue.trim()) {
          params.set('search', newValue.trim());
        } else {
          params.delete('search');
        }
        
        // Always redirect searches to the products page for consistent experience
        const targetPath = '/products';
        
        // Only navigate if we're not already at the products page with the right search term
        const currentQueryString = searchParams.toString();
        const newQueryString = params.toString();
        const shouldNavigate = 
          pathname !== targetPath || 
          currentQueryString !== newQueryString;
          
        if (shouldNavigate) {
          console.log(`Navigating to search: ${newValue.trim()}`);
          router.push(`${targetPath}?${newQueryString}`);
        }
      }
    }, 300);
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    
    if (searchInputValue.trim()) {
      const params = new URLSearchParams();
      params.set('search', searchInputValue.trim());
      
      // Get user location from location store if available
      try {
        const locationStore = require('@/app/lib/locationStore').useLocationStore.getState();
        const userLocation = locationStore.userLocation;
        
        if (userLocation?.latitude && userLocation?.longitude) {
          // Ensure values are valid numbers and convert to string
          const lat = parseFloat(userLocation.latitude);
          const lng = parseFloat(userLocation.longitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            params.set('latitude', lat.toString());
            params.set('longitude', lng.toString());
            params.set('radius', '3'); // Default 3km radius
            console.log(`Adding location to search: lat=${lat}, lon=${lng}`);
          }
        }
      } catch (err) {
        console.error('Error accessing location store:', err);
      }
      
      // Navigate to products page with search
      console.log(`Form submit - searching for: ${searchInputValue.trim()}`);
      router.push(`/products?${params.toString()}`);
    }
  };

  // Authentication verification logic...
  useEffect(() => {
    // ... (existing verifyAuth logic) ...
  }, []); // Removed seller and user dependencies as they are handled internally

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

  // Handlers for logout...
  const handleSellerLogout = () => {
    logout(); // Use the logout function from context
    setIsSellerDropdownOpen(false);
    router.push('/seller/signin');
  };
  
  const handleUserLogout = () => {
    logout(); // Use the logout function from context
    setIsUserDropdownOpen(false);
  };

  // Get Breadcrumbs (if needed, might be removed or simplified)
  // const breadcrumbs = getBreadcrumbs(); 

  // Decide whether to show the navbar
  const showNavbar = true; // Remove the path-based restriction

  if (!showNavbar) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 w-full">
      {/* Desktop Navbar - hidden on mobile */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative flex items-center justify-between h-16">
            {/* Left Section: Logo and Location */}
            <div className="flex items-center flex-shrink-0">
              <Link href={`${redirect}`} className="flex-shrink-0">
                <Image
                  src="/logo.svg"
                  alt="Fast&Fab Logo"
                  width={90}
                  height={25}
                  className="block"
                />
              </Link>
              
              {/* Clickable Location display - only show on non-seller/non-admin routes */}
              {!isSellerRoute && !isAdminRoute && (
                <div 
                  className="flex-grow flex flex-col items-start cursor-pointer ml-3"
                  onClick={() => setIsLocationModalOpen(true)}
                  data-location-trigger
                >
                  <span className="text-xs text-gray-500">
                    Deliver to {user ? user.name || 'You' : 'You'}
                  </span>
                  <div className="flex items-center text-text-muted hover:text-text-dark">
                    <FiMapPin className="mr-1" size={14} />
                    <span className="text-sm font-medium truncate max-w-[130px]">{currentLocation}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Middle Section: Search Bar - Show on non-seller/non-admin routes */}
            {!isSellerRoute && !isAdminRoute && (
              <div className="flex-1 mx-2 max-w-lg pr-2"> 
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    value={searchInputValue}
                    onChange={handleSearchInputChange}
                    placeholder="Search products..."
                    className="w-full p-1.5 pl-8 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input text-sm"
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                  <button 
                    type="submit" 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                    aria-label="Search"
                  >
                    <span className="sr-only">Search</span>
                  </button>
                </form>
              </div>
            )}
            
            {/* Conditional rendering for admin/seller specific UI */}
            {isAdminRoute && (
               <div className="flex-1 flex justify-center">
                 <span className="text-xl font-semibold text-primary">Admin Dashboard</span>
               </div>
            )}
            {isSellerRoute && !isAdminRoute && (
              <div className="flex-1 flex justify-center">
                <span className="text-xl font-semibold text-primary">Seller Dashboard</span>
              </div>
            )}

            {/* Right Section: Desktop Navigation & Auth */}
            <div className="hidden md:flex md:items-center md:space-x-6">
               {/* Show standard links only if not seller/admin */}
              {!isSellerRoute && !isAdminRoute && (
                <>
                  <Link
                    href="/seller/signup"
                    className="text-secondary hover:text-secondary-dark"
                  >
                    Become a Seller
                  </Link>
                  <div className="flex items-center bg-white">
                    <Image 
                      src="/delivery-icon.png.png" 
                      alt="Fast Delivery" 
                      width={55} 
                      height={55}
                      className="mx-1"
                      style={{ backgroundColor: "white", objectFit: "contain" }}
                    />
                  </div>
                </>
              )}

              {/* Auth section (User/Seller/Login) */}
              <div className="flex items-center space-x-4">
                {user && !seller ? (
                  <>
                    <UserDropdown
                      user={user}
                      isOpen={isUserDropdownOpen}
                      setIsOpen={setIsUserDropdownOpen}
                      onLogout={handleUserLogout}
                      userDropdownRef={userDropdownRef}
                    />
                  </>
                ) : seller && !user ? (
                  <SellerDropdown
                    seller={seller}
                    isOpen={isSellerDropdownOpen}
                    setIsOpen={setIsSellerDropdownOpen}
                    onLogout={handleSellerLogout}
                    sellerDropdownRef={sellerDropdownRef}
                  />
                ) : (
                  // Show Login/Signup only on non-seller/non-admin routes when logged out
                  !isSellerRoute && !isAdminRoute && <AuthLinks />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navbar - Amazon style - visible only on mobile */}
      <div className="md:hidden">
        {/* Top Row: Logo, Location, Delivery Icon, User, Menu Button */}
        <div className="bg-white py-2 px-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link href={`${redirect}`} className="flex-shrink-0">
              <Image
                src="/logo.svg"
                alt="Fast&Fab Logo"
                width={80}
                height={22}
              />
            </Link>
            
            {/* Location - moved from third row to here */}
            <div 
              className="ml-2 flex flex-col cursor-pointer"
              onClick={() => setIsLocationModalOpen(true)}
              data-location-trigger
            >
              <span className="text-xs text-gray-500">
                Deliver to {user ? user.name || 'You' : 'You'}
              </span>
              <div className="flex items-center text-text-muted">
                <FiMapPin className="mr-1" size={12} />
                <span className="text-xs font-medium truncate max-w-[100px]">{currentLocation}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Delivery Icon */}
            <div className="flex items-center">
              <div className="flex items-center bg-white">
                <Image 
                  src="/delivery-icon.png.png" 
                  alt="Fast Delivery" 
                  width={55} 
                  height={55}
                  className="mx-1"
                  style={{ backgroundColor: "white", objectFit: "contain" }}
                />
              </div>
            </div>
            
            {/* User/Auth */}
            <div className="flex items-center">
              {user ? (
                <div 
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center"
                >
                  <span className="text-sm font-medium mr-1">{user.name}</span>
                  <UserAvatar user={user} />
                </div>
              ) : (
                <Link
                  href="/signup"
                  className="flex items-center"
                >
                  <span className="text-sm font-medium">Sign in</span>
                  <BsPerson className="ml-1 w-6 h-6" />
                </Link>
              )}
            </div>
            
            {/* Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1 rounded-md text-text-dark"
            >
              {isMobileMenuOpen ? (
                <FiX className="block h-6 w-6" />
              ) : (
                <FiMenu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        
        {/* Second Row: Search Bar */}
        <div className="bg-white py-2 px-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchInputValue}
              onChange={handleSearchInputChange}
              placeholder="Search products..."
              className="w-full p-2 pl-8 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input text-sm"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
            <button 
              type="submit" 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
              aria-label="Search"
            >
              <span className="sr-only">Search</span>
            </button>
          </form>
        </div>
        
        {/* Location Bar - Removed as it's now in the top row */}
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-ui-border bg-white">
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
                  onClick={handleUserLogout}
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
                  onClick={handleSellerLogout}
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
      )}

      {/* Location Modal Trigger - Rendered conditionally based on state */}
      {isLocationModalOpen && (
        <LocationModal onClose={() => setIsLocationModalOpen(false)} />
      )}
    </nav>
  );
}

// New wrapper component that applies Suspense
const Navbar = () => {
  return (
    <Suspense fallback={
      <div className="h-16 bg-white shadow-sm flex items-center justify-between px-4">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-32"></div>
        <div className="animate-pulse h-8 bg-gray-200 rounded w-32"></div>
      </div>
    }>
      <NavbarContent />
    </Suspense>
  );
};

export default Navbar;
