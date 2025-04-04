"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import ProductFilters from "@/app/components/ProductFilters";
import NearbyProductsFilter from "@/app/components/NearbyProductsToggle";
import NoNearbyProductsMessage from "@/app/components/NoNearbyProductsMessage";
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
    radius: 3,
  });
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    priceRange: [0, 10000],
    sortBy: "latest",
  });

  const [noNearbyResults, setNoNearbyResults] = useState(false);

  // Helper function to normalize price data
  const normalizePrice = useCallback((priceValue) => {
    if (priceValue === null || priceValue === undefined) return 0;
    if (typeof priceValue === "number") return priceValue;
    if (typeof priceValue === "string") {
      const cleanPrice = priceValue.replace(/[^\d.-]/g, "");
      const parsedPrice = parseFloat(cleanPrice);
      if (isNaN(parsedPrice)) {
        console.warn(
          `normalizePrice: Could not parse price string: '${priceValue}' -> '${cleanPrice}'. Returning 0.`
        );
        return 0;
      }
      return parsedPrice;
    }
    // If it's neither number nor string, log a warning
    console.warn(
      `normalizePrice: Unexpected price type: ${typeof priceValue}, value:`,
      priceValue,
      `. Returning 0.`
    );
    return 0;
  }, []);

  // Stable fetch function for the 'Try Again' button
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoNearbyResults(false);

      const searchTerm = searchParams.get("search") || "";
      const queryParams = new URLSearchParams();
      if (searchTerm.trim()) queryParams.append("search", searchTerm.trim());
      if (filters.category) queryParams.append("category", filters.category);
      if (filters.minPrice !== null)
        queryParams.append("minPrice", filters.minPrice);
      if (filters.maxPrice !== null)
        queryParams.append("maxPrice", filters.maxPrice);

      const hasLocationData =
        locationFilter.enabled &&
        locationFilter.location?.latitude &&
        locationFilter.location?.longitude;
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
      if (!response.ok)
        throw new Error(`Failed to fetch products: ${response.status}`);
      let data = await response.json();
      if (
        hasLocationData &&
        data.isLocationFilter &&
        data.products.length === 0
      ) {
        setNoNearbyResults(true);
        return;
      }
      let productList = Array.isArray(data) ? data : data.products || [];

      // Apply client-side filtering (same logic as before)
      if (filters.subcategory) {
        productList = productList.filter(
          (p) =>
            p.subcategory?.toLowerCase() === filters.subcategory.toLowerCase()
        );
      }
      if (filters.size) {
        productList = productList.filter(
          (p) => p.sizeQuantities?.[filters.size] > 0
        );
      }
      if (filters.minPrice !== null || filters.maxPrice !== null) {
        productList = productList.filter((product) => {
          const price = normalizePrice(product.sellingPrice);
          if (filters.minPrice !== null && filters.maxPrice !== null)
            return price >= filters.minPrice && price < filters.maxPrice;
          if (filters.minPrice !== null) return price >= filters.minPrice;
          if (filters.maxPrice !== null) return price < filters.maxPrice;
          return true;
        });
      }
      if (filters.sort) {
        productList = [...productList].sort((a, b) => {
          /* ... sort logic ... */
        });
      }
      if (hasLocationData && !filters.sort) {
        productList.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity)
        );
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
  const currentSearchTerm = searchParams.get("search") || "";
  const searchParamsString = searchParams.toString();
  const filtersKey = JSON.stringify(filters);
  const locationFilterKey = JSON.stringify(locationFilter);

  // This useEffect triggers the fetch based *only* on stable keys derived from state/props
  useEffect(() => {
    console.log(
      `[Effect Trigger] Params: ${searchParamsString}, Filters: ${filtersKey}, Location: ${locationFilterKey}`
    );

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
        if (filters.minPrice !== null)
          queryParams.append("minPrice", filters.minPrice);
        if (filters.maxPrice !== null)
          queryParams.append("maxPrice", filters.maxPrice);

        const hasLocationData =
          locationFilter.enabled &&
          locationFilter.location?.latitude &&
          locationFilter.location?.longitude;
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
        if (!response.ok)
          throw new Error(`Failed to fetch products: ${response.status}`);
        let data = await response.json();

        if (
          hasLocationData &&
          data.isLocationFilter &&
          data.products.length === 0
        ) {
          setNoNearbyResults(true);
          setProducts([]); // Ensure products are cleared
          setLoading(false); // Set loading false here
          return; // Exit early
        }

        let productList = Array.isArray(data) ? data : data.products || [];

        // Apply client-side filtering (same logic as before)
        if (filters.subcategory) {
          productList = productList.filter(
            (p) =>
              p.subcategory?.toLowerCase() === filters.subcategory.toLowerCase()
          );
        }
        if (filters.size) {
          productList = productList.filter(
            (p) => p.sizeQuantities?.[filters.size] > 0
          );
        }
        if (filters.minPrice !== null || filters.maxPrice !== null) {
          const originalCount = productList.length;
          productList = productList.filter((product) => {
            const price = normalizePrice(product.sellingPrice);
            if (filters.minPrice !== null && filters.maxPrice !== null)
              return price >= filters.minPrice && price < filters.maxPrice;
            if (filters.minPrice !== null) return price >= filters.minPrice;
            if (filters.maxPrice !== null) return price < filters.maxPrice;
            return true;
          });
          console.log(
            `[Client Price Filter] ${originalCount} -> ${productList.length}`
          );
        }
        if (filters.sort) {
          productList = [...productList].sort((a, b) => {
            /* ... sort logic ... */
          });
          // Make sure sort logic is copied correctly or refactored
          switch (filters.sort) {
            case "price_asc":
              return Number(a.sellingPrice) - Number(b.sellingPrice);
            case "price_desc":
              return Number(b.sellingPrice) - Number(a.sellingPrice);
            case "newest":
              return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            // Add other cases if needed
            default:
              return 0;
          }
        }
        if (hasLocationData && !filters.sort) {
          productList.sort(
            (a, b) => (a.distance || Infinity) - (b.distance || Infinity)
          );
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
            className="mt-4 text-secondary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Product filters and results */}
      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        {/* Left column: Filters */}
        <div className="lg:col-span-1 mb-4 lg:mb-0">
          <ProductFilters filters={filters} setFilters={setFilters} />

          <div className="mt-6">
            <NearbyProductsFilter
              locationFilter={locationFilter}
              onLocationFilterChange={handleLocationFilterChange}
            />
          </div>
        </div>

        {/* Right column: Products grid */}
        <div className="lg:col-span-3">
          {/* Show message when no products with location filter */}
          {noNearbyResults && <NoNearbyProductsMessage />}

          {/* Title section with result count */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Products {products.length > 0 ? `(${products.length})` : ""}
            </h1>
          </div>

          {/* Product Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            // Show message when no products found (but not location filtered)
            !noNearbyResults && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  No products found matching your criteria.
                </p>
                <button
                  onClick={() => {
                    setFilters({
                      category: "",
                      subcategory: "",
                      size: "",
                      minPrice: null,
                      maxPrice: null,
                      sort: "",
                    });
                    setLocationFilter({
                      enabled: false,
                      location: null,
                      radius: 3,
                    });
                  }}
                  className="mt-4 text-primary hover:underline"
                >
                  <FiSearch size={20} />
                </button>

                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    handleLocationFilterChange({
                      ...locationFilter,
                      sortBy: e.target.value,
                    })
                  }
                  className="mt-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="latest">Latest</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="large" color="secondary" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
