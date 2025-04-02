"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import ProductFilters from "@/app/components/ProductFilters";
import NearbyProductsFilter from '@/app/components/NearbyProductsToggle';
import NoNearbyProductsMessage from '@/app/components/NoNearbyProductsMessage';
import React from "react";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationFilter, setLocationFilter] = useState({
    enabled: false,
    location: null,
    radius: 3
  });
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    size: "",
    minPrice: null,
    maxPrice: null,
    sort: "",
  });
  
  const [noNearbyResults, setNoNearbyResults] = useState(false);
  
  // Helper function to normalize price data
  const normalizePrice = (priceValue) => {
    if (priceValue === null || priceValue === undefined) return 0;
    if (typeof priceValue === 'number') return priceValue;
    if (typeof priceValue === 'string') {
      const cleanPrice = priceValue.replace(/[^\d.-]/g, '');
      const parsedPrice = parseFloat(cleanPrice);
      if (isNaN(parsedPrice)) {
        console.warn(`normalizePrice: Could not parse price string: '${priceValue}' -> '${cleanPrice}'. Returning 0.`);
        return 0;
      }
      return parsedPrice;
    }
    // If it's neither number nor string, log a warning
    console.warn(`normalizePrice: Unexpected price type: ${typeof priceValue}, value:`, priceValue, `. Returning 0.`);
    return 0;
  };

  // Stable fetch function for the 'Try Again' button
  const fetchProducts = useCallback(async () => {
    // Fetch logic identical to the one inside useEffect below
    // This ensures clicking 'Try Again' re-runs the fetch with current state
    try {
      setLoading(true);
      setError(null);
      setNoNearbyResults(false);
      
      const searchTerm = searchParams.get('search') || '';
      const queryParams = new URLSearchParams();
      if (searchTerm.trim()) queryParams.append("search", searchTerm.trim());
      if (filters.category) queryParams.append("category", filters.category);
      if (filters.minPrice !== null) queryParams.append("minPrice", filters.minPrice);
      if (filters.maxPrice !== null) queryParams.append("maxPrice", filters.maxPrice);

      const hasLocationData = locationFilter.enabled && locationFilter.location?.latitude && locationFilter.location?.longitude;
      if (hasLocationData) {
        queryParams.append("latitude", locationFilter.location.latitude);
        queryParams.append("longitude", locationFilter.location.longitude);
        queryParams.append("radius", locationFilter.radius);
      }

      let endpoint;
      if (searchTerm.trim()) endpoint = `/api/products/search`;
      else if (hasLocationData) endpoint = `/api/products/nearby`;
      else endpoint = PUBLIC_ENDPOINTS.PRODUCTS;

      const response = await fetch(`${endpoint}?${queryParams.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
      let data = await response.json();
      if (hasLocationData && data.isLocationFilter && data.products.length === 0) {
        setNoNearbyResults(true);
        return;
      }
      let productList = Array.isArray(data) ? data : (data.products || []);
      
      // Apply client-side filtering (same logic as before)
      if (filters.subcategory) {
          productList = productList.filter(p => p.subcategory?.toLowerCase() === filters.subcategory.toLowerCase());
      }
      if (filters.size) {
          productList = productList.filter(p => p.sizeQuantities?.[filters.size] > 0);
      }
      if (filters.minPrice !== null || filters.maxPrice !== null) {
          productList = productList.filter(product => {
              const price = normalizePrice(product.sellingPrice);
              if (filters.minPrice !== null && filters.maxPrice !== null) return price >= filters.minPrice && price < filters.maxPrice;
              if (filters.minPrice !== null) return price >= filters.minPrice;
              if (filters.maxPrice !== null) return price < filters.maxPrice;
              return true;
          });
      }
      if (filters.sort) {
          productList = [...productList].sort((a, b) => { /* ... sort logic ... */ });
      }
      if (hasLocationData && !filters.sort) {
          productList.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }

      setProducts(productList);
    } catch (error) {
      console.error("Failed to fetch products (from button click):", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependencies for stable identity needed for button

  // Define stable keys from the state objects OUTSIDE the useEffect
  const currentSearchTerm = searchParams.get('search') || '';
  const searchParamsString = searchParams.toString();
  const filtersKey = JSON.stringify(filters);
  const locationFilterKey = JSON.stringify(locationFilter);

  // This useEffect triggers the fetch based *only* on stable keys derived from state/props
  useEffect(() => {
    console.log(`[Effect Trigger] Params: ${searchParamsString}, Filters: ${filtersKey}, Location: ${locationFilterKey}`);

    // Define and call the async fetch logic directly inside the effect
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            setNoNearbyResults(false);
            
            // Get search term from URL (using the stable key is fine here too)
            const searchTerm = currentSearchTerm;
            
            // Create query params (using state directly is fine here as effect reruns when they change)
            const queryParams = new URLSearchParams();
            if (searchTerm.trim()) queryParams.append("search", searchTerm.trim());
            if (filters.category) queryParams.append("category", filters.category);
            if (filters.minPrice !== null) queryParams.append("minPrice", filters.minPrice);
            if (filters.maxPrice !== null) queryParams.append("maxPrice", filters.maxPrice);
    
            const hasLocationData = locationFilter.enabled && locationFilter.location?.latitude && locationFilter.location?.longitude;
            if (hasLocationData) {
              queryParams.append("latitude", locationFilter.location.latitude);
              queryParams.append("longitude", locationFilter.location.longitude);
              queryParams.append("radius", locationFilter.radius);
            }
            
            let endpoint;
            if (searchTerm.trim()) {
              endpoint = `/api/products/search`;
            } else if (hasLocationData) {
              endpoint = `/api/products/nearby`;
            } else {
              endpoint = PUBLIC_ENDPOINTS.PRODUCTS;
            }
            
            const response = await fetch(`${endpoint}?${queryParams.toString()}`);
            if (!response.ok) throw new Error(`Failed to fetch products: ${response.status}`);
            let data = await response.json();

            if (hasLocationData && data.isLocationFilter && data.products.length === 0) {
                setNoNearbyResults(true);
                setProducts([]); // Ensure products are cleared
                setLoading(false); // Set loading false here
                return; // Exit early
            }

            let productList = Array.isArray(data) ? data : (data.products || []);
            
            // Apply client-side filtering (same logic as before)
            if (filters.subcategory) {
                productList = productList.filter(p => p.subcategory?.toLowerCase() === filters.subcategory.toLowerCase());
            }
            if (filters.size) {
                productList = productList.filter(p => p.sizeQuantities?.[filters.size] > 0);
            }
            if (filters.minPrice !== null || filters.maxPrice !== null) {
                const originalCount = productList.length;
                productList = productList.filter(product => {
                    const price = normalizePrice(product.sellingPrice);
                    if (filters.minPrice !== null && filters.maxPrice !== null) return price >= filters.minPrice && price < filters.maxPrice;
                    if (filters.minPrice !== null) return price >= filters.minPrice;
                    if (filters.maxPrice !== null) return price < filters.maxPrice;
                    return true;
                });
                console.log(`[Client Price Filter] ${originalCount} -> ${productList.length}`);
            }
            if (filters.sort) {
                productList = [...productList].sort((a, b) => { /* ... sort logic ... */ });
                // Make sure sort logic is copied correctly or refactored
                 switch (filters.sort) {
                    case 'price_asc': return Number(a.sellingPrice) - Number(b.sellingPrice);
                    case 'price_desc': return Number(b.sellingPrice) - Number(a.sellingPrice);
                    case 'newest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    // Add other cases if needed
                    default: return 0;
                 }
            }
            if (hasLocationData && !filters.sort) {
                productList.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
            }
    
            setProducts(productList);
          } catch (error) {
            console.error("Failed to fetch products (from effect):", error);
            setError(error.message);
          } finally {
            setLoading(false);
          }
    };

    fetchData(); // Execute the fetch logic

  }, [searchParamsString, filtersKey, locationFilterKey]); // Depend on stringified params and filters

  // Handler for location filter changes - Memoize this handler
  const handleLocationFilterChange = useCallback((newLocationFilter) => {
    setLocationFilter(newLocationFilter);
  }, []); // setLocationFilter is stable, so empty dependency array is fine

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="secondary" />
      </div>
    );
  }

  if (error) {
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
          <p className="mt-2 text-gray-500">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-4 text-[#8B6E5A] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6">
        All Products
      </h1>
      
      {/* Remove Debug panel for development */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Debug Info:</h3>
          <div className="text-xs">
            <p>Price Filter: {filters.minPrice !== null || filters.maxPrice !== null ? 
              `${filters.minPrice === null ? 'Under' : filters.minPrice}${filters.maxPrice === null ? ' & Above' : ' - ' + filters.maxPrice}` 
              : 'None'}</p>
            <p>Total Products (after filtering): {products.length}</p>
            {filters.minPrice === 5000 && filters.maxPrice === null && (
              <p className="text-red-500 font-bold">₹5000 & Above filter active</p>
            )}
          </div>
        </div>
      )} */}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with filters */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {/* Remove NearbyProductsFilter component */}
            {/* <NearbyProductsFilter onChange={handleLocationFilterChange} /> */}
            <ProductFilters filters={filters} setFilters={setFilters} />
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="lg:col-span-3">
          {noNearbyResults ? (
            <NoNearbyProductsMessage radius={locationFilter.radius} />
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  showSellerDistance={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mx-auto text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Products Found
              </h3>
              <p className="mt-2 text-gray-500">
                Try adjusting your filters or check back later
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
