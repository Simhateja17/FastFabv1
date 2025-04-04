"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import ProductFilters from "@/app/components/ProductFilters";
import NearbyProductsFilter from '@/app/components/NearbyProductsToggle';
import NoNearbyProductsMessage from '@/app/components/NoNearbyProductsMessage';
import React from "react";
import { toast } from "react-hot-toast";
import ProductGrid from "../components/ProductGrid";
import FilterSidebar from "../components/FilterSidebar";
import { FiSearch } from "react-icons/fi";
import PageHero from "../components/PageHero";

function ProductsContent() {
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
    category: searchParams.get("category") || "",
    priceRange: [0, 10000],
    sortBy: "latest",
  });
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  
  const [noNearbyResults, setNoNearbyResults] = useState(false);
  
  // Helper function to normalize price data
  const normalizePrice = useCallback((priceValue) => {
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
  }, []);

  // Stable fetch function for the 'Try Again' button
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get search term from URL
      const searchTerm = searchParams.get('search') || '';

      // Create query params
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

      let productList = Array.isArray(data) ? data : (data.products || []);
      
      // Apply client-side filtering
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
  }, [filters, locationFilter, searchParams, normalizePrice]);

  // Define stable keys from the state objects OUTSIDE the useEffect
  const currentSearchTerm = searchParams.get('search') || '';
  const searchParamsString = searchParams.toString();
  const filtersKey = JSON.stringify(filters);
  const locationFilterKey = JSON.stringify(locationFilter);

  // This useEffect triggers the fetch based *only* on stable keys derived from state/props
  useEffect(() => {
    // Log the current search parameters and filters inside the effect
    console.log(`[Effect Trigger] Fetch products with current parameters`);

    // Define and call the async fetch logic directly inside the effect
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            setNoNearbyResults(false);
            
            // Get search term from URL
            const searchTerm = searchParams.get('search') || '';
            
            // Create query params
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

  }, [searchParams, filters, locationFilter, normalizePrice]);

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
            className="mt-4 text-secondary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero title="All Products" subtitle="Discover our collection" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/4">
            <FilterSidebar 
              filters={filters}
              onFilterChange={handleLocationFilterChange}
            />
          </div>
          
          <div className="w-full md:w-3/4">
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button 
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary"
                >
                  <FiSearch size={20} />
                </button>
              </div>
              
              <select
                value={filters.sortBy}
                onChange={(e) => handleLocationFilterChange({ ...locationFilter, sortBy: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="latest">Latest</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
            
            <ProductGrid 
              products={products} 
              loading={loading}
              error={error}
              onRetry={fetchProducts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
