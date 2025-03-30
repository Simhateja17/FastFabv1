"use client";

import { useState, useEffect, useCallback } from "react";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag, FiMapPin } from "react-icons/fi";
import ProductFilters from "@/app/components/ProductFilters";
import { SafeLocationConsumer } from "@/app/components/SafeLocationWrapper";

export default function MenProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [lastUserLocation, setLastUserLocation] = useState(null);
  const [filters, setFilters] = useState({
    category: "MEN", // Default to MEN category
    subcategory: "",
    size: "",
    minPrice: null,
    maxPrice: null,
    sort: "",
  });

  // Fetch products with location filtering
  const fetchProducts = useCallback(async (locationData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Enforce location data first
      if (!locationData?.latitude || !locationData?.longitude) {
        console.log("No location data available, users must set their location to view products");
        setLocationError(true);
        setLoading(false);
        return;
      }
      
      // Create query params including location for 3km restriction
      const queryParams = new URLSearchParams();
      queryParams.append("category", filters.category); // Always include MEN category
      queryParams.append("latitude", locationData.latitude);
      queryParams.append("longitude", locationData.longitude);
      queryParams.append("radius", 3); // Enforce 3km radius
      
      console.log(`Fetching men's products within 3km of [${locationData.latitude}, ${locationData.longitude}]`);
      
      // Use the nearby products API endpoint to enforce 3km radius
      const response = await fetch(
        `/api/products/nearby?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if location filtering was applied
      if (data.isLocationFilter) {
        console.log(`Location-filtered products: ${data.products.length} men's products within 3km radius`);
      }
      
      // Ensure we only have MEN products
      let filteredProducts = data.products.filter(
        product => product.category === "MEN" || product.category === "Men"
      );
      
      // Apply subcategory filter if selected
      if (filters.subcategory) {
        filteredProducts = filteredProducts.filter(
          product => 
            product.subcategory && 
            product.subcategory.toLowerCase() === filters.subcategory.toLowerCase()
        );
      }
      
      // Apply size filter if selected
      if (filters.size) {
        filteredProducts = filteredProducts.filter(
          product => 
            product.sizeQuantities && 
            product.sizeQuantities[filters.size] && 
            product.sizeQuantities[filters.size] > 0
        );
      }
      
      // Apply client-side filtering for price if needed
      if (filters.minPrice !== null || filters.maxPrice !== null) {
        filteredProducts = filteredProducts.filter(product => {
          const price = Number(product.sellingPrice);
          if (filters.minPrice !== null && filters.maxPrice !== null) {
            return price >= filters.minPrice && price <= filters.maxPrice;
          } else if (filters.minPrice !== null) {
            return price >= filters.minPrice;
          } else if (filters.maxPrice !== null) {
            return price <= filters.maxPrice;
          }
          return true;
        });
      }
      
      // Apply sorting
      if (filters.sort) {
        filteredProducts = [...filteredProducts].sort((a, b) => {
          switch (filters.sort) {
            case 'price_asc':
              return Number(a.sellingPrice) - Number(b.sellingPrice);
            case 'price_desc':
              return Number(b.sellingPrice) - Number(a.sellingPrice);
            case 'newest':
              return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            case 'popular':
              // If you have popularity metrics like views or sales, use them here
              return 0;
            default:
              return 0;
          }
        });
      }
      
      setProducts(filteredProducts);
      setLocationError(filteredProducts.length === 0);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Track location changes
  useEffect(() => {
    if (lastUserLocation) {
      fetchProducts(lastUserLocation);
    }
  }, [lastUserLocation, fetchProducts, filters]);

  // Location error message component
  const LocationErrorMessage = () => (
    <div className="text-center py-12 bg-red-50 rounded-lg shadow-sm mb-8">
      <FiMapPin className="w-12 h-12 mx-auto text-red-400" />
      <h3 className="mt-4 text-lg font-medium text-red-600">Location Required</h3>
      <p className="mt-2 text-red-500 max-w-md mx-auto">
        We need your location to show you products within 3km of your area.
        No products can be displayed until you set your location.
      </p>
      <button
        onClick={() => document.querySelector('[data-location-trigger]')?.click()}
        className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
      >
        Set Your Location
      </button>
    </div>
  );

  return (
    <SafeLocationConsumer>
      {({ userLocation, loading: locationLoading }) => {
        // Update local state when location changes
        if (userLocation && 
            (!lastUserLocation || 
             lastUserLocation.latitude !== userLocation.latitude || 
             lastUserLocation.longitude !== userLocation.longitude)) {
          setLastUserLocation(userLocation);
        }

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6">Men's Collection</h1>
            
            {/* Show location error if needed */}
            {locationError && <LocationErrorMessage />}
            
            {/* New ProductFilters component with fixed category */}
            <ProductFilters 
              filters={filters} 
              setFilters={setFilters} 
              availableCategories={["MEN"]} // Only show MEN category
            />
    
            {/* Products Grid */}
            {loading || locationLoading ? (
              <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="large" color="secondary" />
              </div>
            ) : error ? (
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
                    onClick={() => fetchProducts(lastUserLocation)}
                    className="mt-4 text-[#8B6E5A] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : products.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm mt-6">
                <FiShoppingBag className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No Products Found
                </h3>
                <p className="mt-2 text-gray-500">
                  {userLocation 
                    ? "No men's products found within 3km of your location. Try changing your location."
                    : "Please set your location to view nearby products."}
                </p>
                {!userLocation && (
                  <button
                    onClick={() => document.querySelector('[data-location-trigger]')?.click()}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Set Your Location
                  </button>
                )}
              </div>
            )}
          </div>
        );
      }}
    </SafeLocationConsumer>
  );
} 