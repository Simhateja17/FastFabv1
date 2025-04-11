"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { FiShoppingBag, FiMapPin, FiFilter, FiAlertCircle, FiChevronRight } from "react-icons/fi";
import ProductFilters from "@/app/components/ProductFilters";
import { useLocationStore } from "@/app/lib/locationStore";
import LocationRequiredMessage from "@/app/components/LocationRequiredMessage";

// This prevents any useSearchParams calls during server rendering
function WomenProductsContent() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [lastUserLocation, setLastUserLocation] = useState(null);
  const [filters, setFilters] = useState({
    category: "WOMEN", // Keep this for filtering component
    subcategory: "",
    size: "",
    minPrice: null,
    maxPrice: null,
    sort: "",
  });

  // Get location data from store
  const userLocation = useLocationStore(state => state.userLocation);
  
  // Simplified fetch products function (similar to homepage)
  const fetchProducts = useCallback(async (location, currentFilters) => {
    if (!location?.latitude || !location?.longitude) {
      console.log("Women's Products: Fetch skipped - Location not available");
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
        category: "Women", // Women's category only
      });

      // Add filters if they exist
      if (currentFilters.subcategory) params.append("subcategory", currentFilters.subcategory);
      if (currentFilters.minPrice) params.append("minPrice", currentFilters.minPrice);
      if (currentFilters.maxPrice) params.append("maxPrice", currentFilters.maxPrice);
      if (currentFilters.sort) params.append("sort", currentFilters.sort);

      console.log(`Women's page: Fetching products with params:`, params.toString());
      const response = await fetch(`/api/products/nearby?${params.toString()}`);
      
      if (!response.ok) {
        console.error(`Failed to fetch women's products: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Women's page: Fetched ${data.products?.length || 0} products`);
      
      let fetchedProducts = data.products || [];
      
      // Apply client-side size filter if needed
      if (currentFilters.size && fetchedProducts.length > 0) {
        const beforeFilterCount = fetchedProducts.length;
        fetchedProducts = fetchedProducts.filter(
          product => 
            product.sizeQuantities && 
            product.sizeQuantities[currentFilters.size] && 
            product.sizeQuantities[currentFilters.size] > 0
        );
        console.log(`Size filter reduced products from ${beforeFilterCount} to ${fetchedProducts.length}`);
      }
      
      setProducts(fetchedProducts);
    } catch (err) {
      console.error("Failed to fetch women's products:", err);
      setError(err.message || "Failed to load products. Please try again later.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Track location changes and refetch products (similar to homepage)
  useEffect(() => {
    if (userLocation && 
       (!lastUserLocation || 
        lastUserLocation.latitude !== userLocation.latitude || 
        lastUserLocation.longitude !== userLocation.longitude)) {
      console.log('Women\'s page: Updating lastUserLocation with:', userLocation);
      setLastUserLocation(userLocation);
      // Fetch products when location is first set or changes
      fetchProducts(userLocation, filters);
    } else if (!userLocation) {
      // Handle case where location is not available
      setLoading(false);
      setLocationError(true);
      setProducts([]); // Clear products if location is lost
    }
  }, [userLocation, lastUserLocation, filters, fetchProducts]);

  // Also fetch when filters change but location stays the same
  useEffect(() => {
    if (userLocation && lastUserLocation && 
        userLocation.latitude === lastUserLocation.latitude && 
        userLocation.longitude === lastUserLocation.longitude) {
      fetchProducts(userLocation, filters);
    }
  }, [filters, userLocation, lastUserLocation, fetchProducts]);

  // Simplified error message components (similar to homepage)
  const LocationErrorMessage = () => (
    <div className="text-center py-12 bg-red-50 rounded-lg shadow-sm mb-8">
      <FiAlertCircle className="w-12 h-12 mx-auto text-red-400" />
      <h3 className="mt-4 text-lg font-medium text-red-600">Location Error</h3>
      <p className="mt-2 text-red-500 max-w-md mx-auto">
        We couldn&apos;t get your location. Please enable location services or set your location manually.
      </p>
    </div>
  );

  // Simplified isLocationSet check (similar to homepage)
  const isLocationSet = userLocation?.latitude && userLocation?.longitude;

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-primary">
            Home
          </Link>
          <FiChevronRight className="mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Women&apos;s Collection</span>
        </nav>

        {/* Show location required message if location is not set */}
        {!isLocationSet && !loading && <LocationRequiredMessage />}
        
        {/* Only show content if location is set or loading */}
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="large" color="secondary" />
          </div>
        ) : locationError ? (
          <LocationErrorMessage />
        ) : error ? (
          <div className="text-center py-12 border border-red-200 rounded-lg mb-8">
            <FiAlertCircle className="w-12 h-12 mx-auto text-red-400" />
            <h3 className="mt-4 text-lg font-medium text-red-600">Error Loading Products</h3>
            <p className="mt-2 text-red-500 max-w-md mx-auto">{error}</p>
            <button 
              onClick={() => fetchProducts(userLocation, filters)} 
              className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Try Again
            </button>
          </div>
        ) : isLocationSet ? (
          <>
            {/* Page Title */}
            <div className="mb-8 border-b border-gray-200 pb-4">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Women&apos;s Collection</h1>
              <p className="text-gray-500 mt-1">Browse our latest women&apos;s fashion</p>
            </div>
            
            {/* Filters and Products Section using Grid */}
            <div className="lg:grid lg:grid-cols-4 lg:gap-8">
              {/* Filters - Takes up 1 column on large screens */}
              <div className="lg:col-span-1 border-r border-gray-200 pr-6">
                <ProductFilters
                  filters={filters}
                  setFilters={setFilters}
                  availableCategories={["WOMEN"]} 
                />
              </div>
              
              {/* Products - Takes up 3 columns on large screens */}
              <div className="lg:col-span-3 mt-6 lg:mt-0 lg:pl-6">
                {/* Product grid - Updated grid columns */}
                {products.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-gray-200 rounded-lg">
                    <FiShoppingBag className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      No Products Found
                    </h3>
                    <p className="mt-2 text-gray-500 max-w-md mx-auto">
                      We couldn&apos;t find any products matching your criteria.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <LocationRequiredMessage />
        )}
      </div>
    </div>
  );
}

// The default export of the page
export default function WomenProductsPage() {
  return <WomenProductsContent />;
}