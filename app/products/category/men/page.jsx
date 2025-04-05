"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { FiShoppingBag, FiMapPin, FiFilter, FiAlertCircle } from "react-icons/fi";
import ProductFilters from "@/app/components/ProductFilters";
import { useLocationStore } from "@/app/lib/locationStore";
import LocationRequiredMessage from "@/app/components/LocationRequiredMessage";

// This prevents any useSearchParams calls during server rendering
function MenProductsContent() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [lastUserLocation, setLastUserLocation] = useState(null);
  const [filters, setFilters] = useState({
    category: "MEN", // Keep this for filtering component
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
      console.log("Men's Products: Fetch skipped - Location not available");
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
        category: "Men", // Men's category only
      });

      // Add filters if they exist
      if (currentFilters.subcategory) params.append("subcategory", currentFilters.subcategory);
      if (currentFilters.minPrice) params.append("minPrice", currentFilters.minPrice);
      if (currentFilters.maxPrice) params.append("maxPrice", currentFilters.maxPrice);
      if (currentFilters.sort) params.append("sort", currentFilters.sort);

      console.log(`Men's page: Fetching products with params:`, params.toString());
      const response = await fetch(`/api/products/nearby?${params.toString()}`);
      
      if (!response.ok) {
        console.error(`Failed to fetch men's products: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Men's page: Fetched ${data.products?.length || 0} products`);
      
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
      console.error("Failed to fetch men's products:", err);
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
      console.log('Men\'s page: Updating lastUserLocation with:', userLocation);
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
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Show location required message if location is not set */}
      {!isLocationSet && !loading && <LocationRequiredMessage />}
      
      {/* Only show content if location is set or loading */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="large" color="secondary" />
        </div>
      ) : locationError ? (
        <LocationErrorMessage />
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg shadow-sm mb-8">
          <FiAlertCircle className="w-12 h-12 mx-auto text-red-400" />
          <h3 className="mt-4 text-lg font-medium text-red-600">Error Loading Products</h3>
          <p className="mt-2 text-red-500 max-w-md mx-auto">{error}</p>
          <button 
            onClick={() => fetchProducts(userLocation, filters)} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Try Again
          </button>
        </div>
      ) : isLocationSet ? (
        <>
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-dark">Men&apos;s Collection</h1>
            <p className="text-text-muted">Browse our latest men&apos;s fashion</p>
          </div>
          
          {/* Filters and Products Section using Grid */}
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Filters - Takes up 1 column on large screens */}
            <div className="lg:col-span-1">
              <ProductFilters
                filters={filters}
                setFilters={setFilters}
                availableCategories={["MEN"]} 
              />
            </div>
            
            {/* Products - Takes up 3 columns on large screens */}
            <div className="lg:col-span-3 mt-6 lg:mt-0">
              {/* Product grid */}
              {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
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
  );
}

// The default export of the page
export default function MenProductsPage() {
  return <MenProductsContent />;
} 