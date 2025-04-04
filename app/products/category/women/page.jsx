"use client";

import { useState, useEffect, useCallback } from "react";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { FiShoppingBag, FiMapPin, FiFilter } from "react-icons/fi";
import ProductFilters from "@/app/components/ProductFilters";
import { useLocationStore } from "@/app/lib/locationStore";
import LocationRequiredMessage from "@/app/components/LocationRequiredMessage";

// This prevents any useSearchParams calls during server rendering
function WomenProductsContent() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: "WOMEN", // Keep this for filtering component
    subcategory: "",
    size: "",
    minPrice: null,
    maxPrice: null,
    sort: "",
  });

  // Get location data from store instead of context
  const userLocation = useLocationStore(state => state.userLocation);
  const isLocationSet = useLocationStore(state => state.isLocationSet);
  const hasValidLocation = useLocationStore(state => state.hasValidLocation);
  const validateLocation = useLocationStore(state => state.validateLocation);
  
  // Perform location validation on mount and whenever location changes
  useEffect(() => {
    console.log("Women's page - Validating location...");
    const isValid = validateLocation();
    console.log(`Women's page - Location validation result:`, isValid, userLocation);
    
    // Log the actual coordinates being used for debugging
    if (userLocation) {
      console.log(`Women's page - Using location data:`, {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        label: userLocation.label,
        lastUpdated: userLocation.timestamp
      });
    }
  }, [validateLocation, userLocation]);

  // Fetch products when location or filters change
  const fetchProducts = useCallback(async (locationData, currentFilters) => {
    if (!locationData?.latitude || !locationData?.longitude) {
      console.log("Women's Page: No location data available, waiting for location.");
      setProducts([]); // Clear products
      setLoading(false);
      return;
    }

    // Log the location data being used for the API call
    console.log(`Women's Page: Fetching products with location:`, {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      label: locationData.label || 'Unknown',
      source: locationData.source || 'Unknown'
    });
    
    try {
      setLoading(true);
      setError(null);
      
      // Use the nearby products API with WOMEN category
      const queryParams = new URLSearchParams({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        radius: 3, // Enforce 3km
        category: "Women", // Changed from "WOMEN" to "Women" to match database case sensitivity
        fetchAll: "true" // Ask backend to fetch all products
      });

      // Add other filters from state
      if (currentFilters.subcategory) queryParams.append("subcategory", currentFilters.subcategory);
      if (currentFilters.minPrice) queryParams.append("minPrice", currentFilters.minPrice);
      if (currentFilters.maxPrice) queryParams.append("maxPrice", currentFilters.maxPrice);
      if (currentFilters.sort) queryParams.append("sort", currentFilters.sort);
      // Note: Size filter might need backend support or remain client-side for now
      
      const url = `/api/products/nearby?${queryParams.toString()}`;
      console.log("Fetching Women's products from:", url);
      console.log("Using location coordinates:", locationData.latitude, locationData.longitude);
      
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        console.error(`Failed to fetch products: ${response.status}`, await response.text());
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      console.log("API response data:", data);
      console.log(`Found ${data.products?.length || 0} products from API`);
      
      // Check if this is a "no sellers in radius" response
      if (data.message === "No sellers found within the specified radius") {
        console.log("No sellers found within 3km radius");
        setError({
          type: "no_sellers",
          message: "No shops found within 3km of your location."
        });
        setProducts([]);
        return;
      }
      
      let fetchedProducts = data.products || [];
      
      // Apply client-side size filter if needed (until backend supports it)
      if (currentFilters.size) {
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
    } catch (error) {
      console.error("Failed to fetch women's products:", error);
      setError(error.message);
      setProducts([]); // Clear products on error
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies will be handled in useEffect

  // Check for refresh flag
  useEffect(() => {
    if (typeof window !== "undefined") {
      const shouldRefresh = localStorage.getItem("refreshWomensProducts") === "true";
      if (shouldRefresh) {
        console.log("Refreshing Women's Products page due to refresh flag");
        localStorage.removeItem("refreshWomensProducts");
        
        // Force fetch with latest location
        if (userLocation) {
          fetchProducts(userLocation, filters);
        }
      }
    }
  }, [filters, fetchProducts, userLocation]);

  // Trigger fetch when location or filters change
  useEffect(() => {
    if (userLocation) {
      fetchProducts(userLocation, filters);
    }
  }, [userLocation, filters, fetchProducts]);
  
  // Error message component
  const ErrorMessage = ({ error, onRetry }) => {
    // Handle different error types
    if (error?.type === "no_sellers") {
      return (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm mt-6">
          <FiMapPin className="w-12 h-12 mx-auto text-orange-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Expanding to Your Area!
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            Currently we&apos;re expanding into your region, we&apos;ll be soon delivering you the outfits you love
          </p>
          <p className="mt-4 text-sm text-gray-500">
            You can try setting a different location or check back later.
          </p>
          <button
            onClick={() => {
              const locationTrigger = document.querySelector('[data-location-trigger]');
              if (locationTrigger) {
                locationTrigger.click();
              } else {
                localStorage.setItem("forceOpenLocationModal", "true");
                window.location.reload();
              }
            }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Change Location
          </button>
        </div>
      );
    }
    
    // Default error message for other errors
    return (
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
          <p className="mt-2 text-gray-500">{error.message || error}</p>
          <button
            onClick={onRetry}
            className="mt-4 text-[#8B6E5A] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Show location required message if location is not set */}
      {(!userLocation || !hasValidLocation()) && !loading && (
        <LocationRequiredMessage />
      )}
      
      {/* Only show content if location is set */}
      {hasValidLocation() && (
        <>
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-dark">Women&apos;s Collection</h1>
            <p className="text-text-muted">Browse our latest women&apos;s fashion</p>
          </div>
          
          {/* Filters and Products Section using Grid */}
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Filters - Takes up 1 column on large screens */}
            <div className="lg:col-span-1">
              <ProductFilters
                filters={filters}
                setFilters={setFilters}
                availableCategories={["WOMEN"]} 
              />
            </div>
            
            {/* Products - Takes up 3 columns on large screens */}
            <div className="lg:col-span-3 mt-8 lg:mt-0">
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <LoadingSpinner size="large" color="secondary" />
                </div>
              ) : error ? (
                <ErrorMessage 
                  error={error} 
                  onRetry={() => fetchProducts(userLocation, filters)} 
                />
              ) : products.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                  <FiShoppingBag className="w-12 h-12 mx-auto text-secondary opacity-40" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No products found
                  </h3>
                  <p className="mt-2 text-gray-500 max-w-md mx-auto">
                    We couldn&apos;t find any women&apos;s products matching your criteria.
                  </p>
                  <button
                    onClick={() => setFilters({
                      ...filters,
                      subcategory: "",
                      size: "",
                      minPrice: null,
                      maxPrice: null,
                      sort: ""
                    })}
                    className="mt-4 text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex justify-between items-center">
                    <p className="text-text font-medium">
                      {products.length} {products.length === 1 ? 'product' : 'products'} found
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// The default export of the page
export default function WomenProductsPage() {
  return <WomenProductsContent />;
}