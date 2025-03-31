"use client";

import { useState, useEffect, useCallback } from "react";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag, FiMapPin } from "react-icons/fi";
import ProductFilters from "@/app/components/ProductFilters";
import { SafeLocationConsumer } from "@/app/components/SafeLocationWrapper";

export default function WomenProductsPage() {
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

  // Fetch products when location or filters change
  const fetchProducts = useCallback(async (locationData, currentFilters) => {
    if (!locationData?.latitude || !locationData?.longitude) {
      console.log("Women's Page: No location data available, waiting for location.");
      setLocationError(true); // Show location prompt
      setProducts([]); // Clear products
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLocationError(false);
      
      // Use the nearby products API with WOMEN category
      const queryParams = new URLSearchParams({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        radius: 3, // Enforce 3km
        category: "WOMEN", // Hardcode category
        limit: 100, // Fetch more products initially, pagination can be added later
      });

      // Add other filters from state
      if (currentFilters.subcategory) queryParams.append("subcategory", currentFilters.subcategory);
      if (currentFilters.minPrice) queryParams.append("minPrice", currentFilters.minPrice);
      if (currentFilters.maxPrice) queryParams.append("maxPrice", currentFilters.maxPrice);
      if (currentFilters.sort) queryParams.append("sort", currentFilters.sort);
      // Note: Size filter might need backend support or remain client-side for now
      
      const url = `/api/products/nearby?${queryParams.toString()}`;
      console.log("Fetching Women's products from:", url);
      
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      
      let fetchedProducts = data.products || [];
      
      // Apply client-side size filter if needed (until backend supports it)
      if (currentFilters.size) {
        fetchedProducts = fetchedProducts.filter(
          product => 
            product.sizeQuantities && 
            product.sizeQuantities[currentFilters.size] && 
            product.sizeQuantities[currentFilters.size] > 0
        );
      }
      
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Failed to fetch women's products:", error);
      setError(error.message);
      setProducts([]); // Clear products on error
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies will be handled in useEffect

  // Trigger fetch when location or filters change
  useEffect(() => {
    if (lastUserLocation) {
      fetchProducts(lastUserLocation, filters);
    }
  }, [lastUserLocation, filters, fetchProducts]);
  
  // Location error message component (similar to homepage)
  const LocationErrorMessage = () => (
    <div className="text-center py-12 bg-red-50 rounded-lg shadow-sm my-8">
      <FiMapPin className="w-12 h-12 mx-auto text-red-400" />
      <h3 className="mt-4 text-lg font-medium text-red-600">Location Required</h3>
      <p className="mt-2 text-red-500 max-w-md mx-auto">
        We need your location to show Women's products within 3km of your area.
      </p>
      <button
        onClick={() => document.querySelector('[data-location-trigger]')?.click()}
        className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
      >
        Set Your Location
      </button>
    </div>
  );
  
  // Error message component
  const ErrorMessage = ({ error, onRetry }) => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12 mx-auto text-red-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Something went wrong
          </h3>
          <p className="mt-2 text-gray-500">{error}</p>
          <button
            onClick={onRetry}
            className="mt-4 text-[#8B6E5A] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
  );

  return (
    <SafeLocationConsumer>
      {({ userLocation, loading: locationLoading }) => {
        // Update local state when location changes
        useEffect(() => {
           if (!locationLoading && userLocation && 
               (!lastUserLocation || 
                lastUserLocation.latitude !== userLocation.latitude || 
                lastUserLocation.longitude !== userLocation.longitude)) {
             setLastUserLocation(userLocation);
           } else if (!locationLoading && !userLocation) {
             // Ensure location error is shown if location becomes null after initial load
             setLocationError(true);
             setProducts([]);
           }
        }, [userLocation, locationLoading, lastUserLocation]);

        const isLoading = loading || locationLoading;

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6">Women's Collection</h1>
            
            {/* Show location error if location is missing and not loading */}
            {locationError && !userLocation && !locationLoading && <LocationErrorMessage />}
            
            {/* Product Filters - only show if location is available */}
            {userLocation && (
              <ProductFilters 
                filters={filters} 
                setFilters={setFilters} 
                availableCategories={["WOMEN"]} // Only show WOMEN category
              />
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="min-h-[300px] flex items-center justify-center">
                <LoadingSpinner size="large" color="secondary" />
              </div>
            )}

            {/* Error Message */}
            {!isLoading && error && !locationError && (
              <ErrorMessage error={error} onRetry={() => fetchProducts(lastUserLocation, filters)} />
            )}

            {/* Products Grid - Show only if not loading, no errors, and location is set */}
            {!isLoading && !error && !locationError && userLocation && (
              products.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm mt-6">
                  <FiShoppingBag className="w-12 h-12 mx-auto text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No Products Found Nearby
                  </h3>
                  <p className="mt-2 text-gray-500">
                    No Women's products found within 3km. Try adjusting filters or changing your location.
                  </p>
                </div>
              )
            )}
          </div>
        );
      }}
    </SafeLocationConsumer>
  );
} 