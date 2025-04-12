"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from "@/app/components/ProductCard";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag, FiMapPin, FiCompass, FiAlertCircle } from "react-icons/fi";
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

  const searchTerm = searchParams.get("search") || "";

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
    // Add checks for URL params for redirect handling
    const paymentStatus = searchParams.get('payment_status');
    const hasProcessedLocation = localStorage.getItem("locationProcessed");
    
    // Check if we just processed a browser location permission
    if (userLocation && !hasProcessedLocation) {
      console.log('HomePage: First time seeing userLocation after permission granted, fetching products:', userLocation);
      localStorage.setItem("locationProcessed", "true");
      fetchProducts(userLocation, searchTerm);
      return;
    }
    
    // Normal location updates
    if (userLocation && 
       (!lastUserLocation || 
        lastUserLocation.latitude !== userLocation.latitude || 
        lastUserLocation.longitude !== userLocation.longitude)) {
      console.log('HomePage: Updating lastUserLocation with:', userLocation);
      setLastUserLocation(userLocation);
      // Fetch products when location is first set or changes
      fetchProducts(userLocation, searchTerm);
    } else if (!userLocation && !locationLoading) {
      // Handle case where location is not available and not loading
      setLoading(false);
      setLocationError(true);
      setProducts([]); // Clear products if location is lost
    }
  }, [userLocation, locationLoading, searchTerm, lastUserLocation, fetchProducts, searchParams]); // Added searchParams

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

  const LocationErrorMessage = () => (
    <div className="text-center py-12 bg-red-50 rounded-lg shadow-sm mb-8">
      <FiAlertCircle className="w-12 h-12 mx-auto text-red-400" />
      <h3 className="mt-4 text-lg font-medium text-red-600">Location Error</h3>
      <p className="mt-2 text-red-500 max-w-md mx-auto">
        We couldn&apos;t get your location. Please enable location services or set your location manually.
      </p>
      {/* Optionally add a button to trigger location setting */}
    </div>
  );

  const LocationRequiredMessage = () => (
    <div className="text-center py-12 bg-blue-50 rounded-lg shadow-sm mb-8">
      <FiCompass className="w-12 h-12 mx-auto text-blue-400" />
      <h3 className="mt-4 text-lg font-medium text-blue-600">Set Your Location</h3>
      <p className="mt-2 text-blue-500 max-w-md mx-auto">
        Please set your location to see products available near you.
      </p>
      {/* You might want a button here to open the location modal */}
    </div>
  );

  // Moved return statement here
  const isLocationSet = userLocation?.latitude && userLocation?.longitude;

  return (
    <main className="min-h-screen bg-white">
      {/* Seller Banner Modal */}
      <SellerBanner />

      {/* Main Category Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-6">
        <div className="flex justify-center gap-6">
          <Link
            href="/products/category/men"
            className="inline-block bg-black text-white px-10 py-3 rounded-lg shadow-lg hover:bg-gray-800 text-lg font-bold uppercase tracking-wide transition-all duration-300 hover:shadow-xl active:scale-[0.98]"
          >
            Men
          </Link>
          <Link
            href="/products/category/women"
            className="inline-block bg-black text-white px-10 py-3 rounded-lg shadow-lg hover:bg-gray-800 text-lg font-bold uppercase tracking-wide transition-all duration-300 hover:shadow-xl active:scale-[0.98]"
          >
            Women
          </Link>
        </div>
      </div>
      
      {/* Products by Category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* Show location required message if location is not set */}
        {!isLocationSet && !loading && !locationLoading && <LocationRequiredMessage />}
        
        {/* Only show the rest of the content if location is set */}
        {(loading || locationLoading) ? (
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="large" color="secondary" />
          </div>
        ) : isLocationSet && (
          filteredProducts.length > 0 ? (
            searchTerm.trim() !== "" ? (
              // Search results view
              <section>
                <h2 className="text-2xl font-semibold text-primary mb-8">
                  Search Results for &quot;{searchTerm}&quot; 
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ) : (
              // Category view (only show if no search term active)
              categories.map((category) => (
                <section key={category} className="mb-16">
                  <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-2">
                    <h2 className="text-xl md:text-2xl font-extrabold text-primary">
                      {category}
                    </h2>
                    <Link
                      href={`/products/category/${category.toLowerCase()}`}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      View All &rarr;
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {groupedProducts[category].map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              ))
            )
          ) : locationError ? (
            <LocationErrorMessage />
          ) : (
            <div className="text-center py-12 rounded-lg border border-gray-200">
              <FiShoppingBag className="w-12 h-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Products Found
              </h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                {searchTerm.trim() !== "" 
                  ? `We couldn't find any products matching "${searchTerm}". Please try a different search term.`
                  : "We couldn't find any products in your area. Try expanding your search radius or check back later."
                }
              </p>
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="primary" />
      </div>
    }>
      {/* Render the wrapper which handles location context */}
      <HomeContentWrapper />
    </Suspense>
  );
}
