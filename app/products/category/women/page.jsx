"use client";

import { useState, useEffect, useCallback } from "react";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag, FiMapPin } from "react-icons/fi";
import ProductFilters from "@/app/components/ProductFilters";
import { useLocationStore } from "@/app/lib/locationStore";

export default function WomenProductsPage() {
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
  
  // Location error message component (similar to homepage)
  const LocationErrorMessage = () => (
    <div className="text-center py-12 bg-red-50 rounded-lg shadow-sm my-8">
      <FiMapPin className="w-12 h-12 mx-auto text-red-400" />
      <h3 className="mt-4 text-lg font-medium text-red-600">Location Required</h3>
      <p className="mt-2 text-red-500 max-w-md mx-auto">
        We need your location to show Women's products within 3km of your area.
      </p>
      <button
        onClick={() => {
          const locationTrigger = document.querySelector('[data-location-trigger]');
          if (locationTrigger) {
            console.log("Location trigger found, clicking it");
            locationTrigger.click();
          } else {
            console.error("Location trigger not found");
            // Fallback - directly open modal via localStorage
            localStorage.setItem("forceOpenLocationModal", "true");
            window.location.reload();
          }
        }}
        className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
      >
        Set Your Location
      </button>
    </div>
  );
  
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
            Currently we're expanding into your region, we'll be soon delivering you the outfits you love
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

  // Determine if we should show the location error
  const showLocationError = !hasValidLocation();
  
  // Determine if we're still loading
  const isLoading = loading;
  
  // Only show "Expanding" message after we've loaded and found no products
  const showExpandingMessage = !isLoading && !error && !showLocationError && products.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-dark">Women's Collection</h1>
        <p className="text-text-muted">Browse our latest women's fashion</p>
      </div>
      
      {/* Show location error if location is missing */}
      {showLocationError && <LocationErrorMessage />}
      
      {/* Product Filters - only show if location is available */}
      {!showLocationError && (
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
      {!isLoading && error && !showLocationError && (
        <ErrorMessage error={error} onRetry={() => fetchProducts(userLocation, filters)} />
      )}
      
      {/* Show "Expanding" message when no products found after loading */}
      {showExpandingMessage && (
        <ErrorMessage error={{ type: "no_sellers" }} onRetry={() => fetchProducts(userLocation, filters)} />
      )}

      {/* Products Grid - Show only if not loading, no errors, has location, and has products */}
      {!isLoading && !error && !showLocationError && products.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
} 