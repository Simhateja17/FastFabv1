"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from "@/app/components/ProductCard";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag, FiMapPin, FiCompass, FiAlertCircle, FiClock, FiPackage, FiBox, FiShield } from "react-icons/fi";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import SellerBanner from "@/app/components/SellerBanner";
import { SafeLocationConsumer } from "@/app/components/SafeLocationWrapper";
import LocationRequiredMessage from "@/app/components/LocationRequiredMessage";
import { useLocationStore } from "@/app/lib/locationStore";
import { toast } from 'react-hot-toast';

// New component to hold the main content and hook logic
function HomePageContent({ userLocation: contextLocation, loading: locationLoading }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [lastUserLocation, setLastUserLocation] = useState(null);

  const searchTerm = searchParams.get("q") || "";

  // Memoize location for stability
  const userLocation = useMemo(() => contextLocation, [contextLocation]);

  // Check for any payment redirects
  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your order has been placed.');
      router.replace('/');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
      router.replace('/');
    }
  }, [searchParams, router]);

  // Moved fetchProducts definition before useEffect
  const fetchProducts = useCallback(async (location, currentSearchTerm) => {
    if (!location?.latitude || !location?.longitude) {
      console.log("Fetch products skipped: Location not available");
      setLocationError(true);
      setLoading(false);
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);
    setLocationError(false);

    try {
      const params = new URLSearchParams({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 3, // Fixed 3km radius
        page: 1,
        limit: 50, // Fetch more products initially
      });

      if (currentSearchTerm) {
        params.append("search", currentSearchTerm);
      }

      const response = await fetch(`/api/products/nearby?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Please try again later.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []); // Keep empty dependency array for useCallback unless external dependencies are needed

  // Moved useEffect here (now after fetchProducts)
  useEffect(() => {
    if (userLocation && 
       (!lastUserLocation || 
        lastUserLocation.latitude !== userLocation.latitude || 
        lastUserLocation.longitude !== userLocation.longitude)) {
      console.log('Updating lastUserLocation with:', userLocation);
      setLastUserLocation(userLocation);
      // Fetch products when location is first set or changes
      fetchProducts(userLocation, searchTerm);
    } else if (!userLocation && !locationLoading) {
      // Handle case where location is not available and not loading
      setLoading(false);
      setLocationError(true);
      setProducts([]); // Clear products if location is lost
    }
  }, [userLocation, locationLoading, searchTerm, lastUserLocation, fetchProducts]); // Added fetchProducts

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  function groupProductsByCategory(products) {
    const grouped = {};
    products.forEach((product) => {
      const category = product.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      if (grouped[category].length < 4) {
        // Limit to 4 products per category on homepage
        grouped[category].push(product);
      }
    });
    return grouped;
  }

  const groupedProducts = useMemo(() => groupProductsByCategory(products), [products]);
  const categories = useMemo(() => Object.keys(groupedProducts), [groupedProducts]);

  const isLocationSet = userLocation?.latitude && userLocation?.longitude;

  return (
    <main className="bg-white">
      {/* Seller Banner Modal */}
      <SellerBanner />

      {/* Main Category Buttons */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-center gap-6 mb-8">
          <Link
            href="/products/category/men"
            className="inline-block bg-black text-white px-10 py-3 rounded-md hover:bg-gray-800 transition-colors text-lg font-medium"
          >
            Men
          </Link>
          <Link
            href="/products/category/women"
            className="inline-block bg-black text-white px-10 py-3 rounded-md hover:bg-gray-800 transition-colors text-lg font-medium"
          >
            Women
          </Link>
        </div>
      </div>
      
      {/* Products by Category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* Show location required message if location is not set */}
        {!isLocationSet && !loading && !locationLoading && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMapPin className="w-8 h-8 text-gray-700" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Set Your Location</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Please set your location to see products available for fast delivery near you.
            </p>
            <button
              className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800"
              onClick={() => {/* Trigger location modal */}}
            >
              Set Location
            </button>
          </div>
        )}
        
        {/* Only show the rest of the content if location is set */}
        {(loading || locationLoading) ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="large" color="secondary" />
          </div>
        ) : isLocationSet && (
          filteredProducts.length > 0 ? (
            searchTerm.trim() !== "" ? (
              // Search results view
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4">
                  Search Results for &quot;{searchTerm}&quot; 
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ) : (
              // Category view (only show if no search term active)
              categories.map((category) => (
                <section key={category}>
                  <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {category}
                    </h2>
                    <Link
                      href={`/products/category/${category.toLowerCase()}`}
                      className="text-sm text-gray-600 hover:text-black font-medium flex items-center"
                    >
                      View All <span className="ml-1">→</span>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {groupedProducts[category].map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              ))
            )
          ) : locationError ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Location Error</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                We couldn&apos;t access your location. Please enable location services in your browser or set your location manually.
              </p>
              <button
                className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800"
                onClick={() => {/* Trigger location modal */}}
              >
                Set Location Manually
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiShoppingBag className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No Products Found
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {searchTerm.trim() !== "" 
                  ? `We couldn't find any products matching "${searchTerm}". Please try a different search term.`
                  : "We couldn't find any products in your area. Try expanding your search radius or check back later."
                }
              </p>
              <Link
                href="/"
                className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 inline-block"
              >
                Browse All Products
              </Link>
            </div>
          )
        )}
      </div>
    </main>
  );
}

// Original HomeContent renamed and now uses the consumer
function HomeContentWrapper() {
  return (
    <SafeLocationConsumer>
      {({ userLocation, loading }) => (
        <HomePageContent userLocation={userLocation} loading={loading} />
      )}
    </SafeLocationConsumer>
  );
}

// Export the wrapper as the default component
export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSpinner size="large" color="secondary" />}>
      <HomeContentWrapper />
    </Suspense>
  );
}
