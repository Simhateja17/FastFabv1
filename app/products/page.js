"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { useLocationStore } from "@/app/lib/locationStore";

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userLocation } = useLocationStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    totalProducts: 0,
    totalPages: 1,
    currentPage: 1
  });
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
  
  // Debug monitoring for products state
  useEffect(() => {
    console.log(`[STATE UPDATE] Products state updated. Count: ${products.length}`);
    if (products.length > 0) {
      console.log(`First 3 product IDs: ${products.slice(0, 3).map(p => p.id).join(', ')}`);
    }
  }, [products]);

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

  // Define stable keys from the state objects OUTSIDE the useEffect
  const currentSearchTerm = searchParams.get("search") || "";
  const searchParamsString = searchParams.toString();
  const filtersKey = JSON.stringify(filters);

  // Sync local locationFilter state with store/URL state when they change
  useEffect(() => {
    const urlLatitude = searchParams.get("latitude");
    const urlLongitude = searchParams.get("longitude");

    if (urlLatitude && urlLongitude) {
      // If location is in URL, ensure local state reflects that
      if (
        locationFilter.location?.latitude !== parseFloat(urlLatitude) ||
        locationFilter.location?.longitude !== parseFloat(urlLongitude)
      ) {
        console.log("Syncing local location filter from URL params");
        setLocationFilter(prev => ({
          ...prev,
          enabled: true,
          location: {
            latitude: parseFloat(urlLatitude),
            longitude: parseFloat(urlLongitude),
          },
          radius: parseInt(searchParams.get("radius") || "3", 10),
        }));
      }
    } else if (userLocation?.latitude && userLocation?.longitude) {
        // If location is in store (and not URL), ensure local state reflects that
        if (
          !locationFilter.location ||
          locationFilter.location.latitude !== userLocation.latitude ||
          locationFilter.location.longitude !== userLocation.longitude
        ) {
          console.log("Syncing local location filter from location store");
          setLocationFilter(prev => ({
            ...prev,
            enabled: true, // Assume enabled if store has location
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            radius: prev.radius || 3, // Keep existing radius or default
          }));
        }
    } else {
        // If no location in URL or store, ensure local state is disabled
        if (locationFilter.enabled || locationFilter.location) {
            console.log("Disabling local location filter as no location is available");
            setLocationFilter({
                enabled: false,
                location: null,
                radius: 3,
            });
        }
    }
  }, [searchParams, userLocation, locationFilter.enabled, locationFilter.location]);

  // This useEffect triggers the fetch based on stable keys derived from state/props
  useEffect(() => {
    console.log(
      `[Effect Trigger] Params: ${searchParamsString}, Filters: ${filtersKey}, StoreLocation: ${userLocation?.latitude},${userLocation?.longitude}`
    );

    // Define and call the async fetch logic directly inside the effect
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setNoNearbyResults(false);

        // Get search term from URL (using the stable key is fine here too)
        const searchTerm = currentSearchTerm;
        console.log(`Current search term: "${searchTerm}"`);

        // Create query params (using state directly is fine here as effect reruns when they change)
        const queryParams = new URLSearchParams();
        if (searchTerm.trim()) {
          console.log(`Adding search term to query params: "${searchTerm.trim()}"`);
          queryParams.append("search", searchTerm.trim());
        }
        
        // --- Add Page Parameter --- 
        const currentPageParam = searchParams.get('page') || '1'; // Get page from URL, default to 1
        queryParams.append('page', currentPageParam);
        console.log(`Adding page parameter: ${currentPageParam}`);
        // --------------------------
        
        if (filters.category) queryParams.append("category", filters.category);
        if (filters.minPrice !== null && filters.minPrice !== undefined)
          queryParams.append("minPrice", filters.minPrice);
        if (filters.maxPrice !== null && filters.maxPrice !== undefined)
          queryParams.append("maxPrice", filters.maxPrice);

        // Check for location: Prioritize store, then URL params
        const urlLatitude = searchParams.get("latitude");
        const urlLongitude = searchParams.get("longitude");
        const urlRadius = searchParams.get("radius") || "3"; // Default radius from URL

        let hasLocationData = false;

        // Use location from store if available
        if (userLocation?.latitude && userLocation?.longitude) {
          console.log(`Using location from store: lat=${userLocation.latitude}, lon=${userLocation.longitude}, radius=3km`);
          queryParams.append("latitude", userLocation.latitude);
          queryParams.append("longitude", userLocation.longitude);
          queryParams.append("radius", "3"); // Use a default radius or maybe from local state?
          hasLocationData = true;
        }
        // If not in store, check URL params (e.g., direct link with location)
        else if (urlLatitude && urlLongitude) {
          console.log(`Using location from URL params: lat=${urlLatitude}, lon=${urlLongitude}, radius=${urlRadius}`);
          queryParams.append("latitude", urlLatitude);
          queryParams.append("longitude", urlLongitude);
          queryParams.append("radius", urlRadius);
          hasLocationData = true;
        }
        // No location available from store or URL
        else {
          console.log("No location data available from store or URL params.");
        }

        // Always use search endpoint for consistency
        const endpoint = `/api/products/search`;
        
        console.log(`Fetching from: ${endpoint}?${queryParams.toString()}`);
        const response = await fetch(`${endpoint}?${queryParams.toString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API response error: ${response.status} - ${errorText}`);
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        let data;
        try {
          data = await response.json();
          console.log(`Received data from API:`, data);
        } catch (err) {
          console.error("Error parsing API response:", err);
          throw new Error("Invalid response from server");
        }

        // Validate the response structure
        if (!data) {
          console.error("Received empty response from API");
          throw new Error("Empty response from server");
        }

        // Handle "no nearby results" scenario first
        if (
          data.isLocationFilter &&
          (!data.products || data.products.length === 0)
        ) {
          console.log("No nearby products found within radius");
          setNoNearbyResults(true);
          setProducts([]); // Ensure products are cleared
          setPagination({
            totalProducts: 0,
            totalPages: 0,
            currentPage: 1
          });
          setLoading(false); // Set loading false here
          return; // Exit early
        }

        // Directly use the product list from the API response
        const productList = data.products && Array.isArray(data.products) ? data.products : [];
        console.log(`API returned ${productList.length} products`);

        // Basic check for product validity (ensure ID exists)
        const validProducts = productList.filter(product => {
          if (!product || !product.id) {
            console.warn("Filtering out invalid product (missing ID):", product);
            return false;
          }
          return true;
        });

        console.log(`Validated ${validProducts.length} products with IDs`);

        // Update pagination information if available in the response
        if (data.totalProducts !== undefined && data.totalPages !== undefined) {
          console.log(`Pagination info: Total=${data.totalProducts}, Pages=${data.totalPages}, Current=${data.currentPage || 1}`);
          setPagination({
            totalProducts: data.totalProducts,
            totalPages: data.totalPages,
            currentPage: data.currentPage || 1
          });
        } else {
          // If pagination info is missing, derive it from the current product list
          console.warn("Pagination info missing from API response, deriving from productList length.");
          setPagination({
            totalProducts: validProducts.length, // Might be inaccurate if API paginates
            totalPages: 1, // Assume single page if no info
            currentPage: 1
          });
        }

        // Add detailed logging for product handling before setting state
        console.log(`Before setting state: final productList has ${validProducts.length} products`);
        if (validProducts.length > 0) {
          console.log(`First product sample before setState:`, JSON.stringify(validProducts[0], null, 2).substring(0, 300) + '...');
        }

        // Directly set the products state with the validated list from the API
        setProducts(validProducts);

        // Force immediate check if products are present in state
        console.log("Immediately after setState call (may not reflect sync state yet)");

        // If we have search results, scroll to top
        if (validProducts.length > 0) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
      } catch (error) {
        console.error("Failed to fetch products (from effect):", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    searchParamsString,
    filtersKey,
    currentSearchTerm,
    userLocation?.latitude,
    userLocation?.longitude,
    filters.category,
    filters.maxPrice,
    filters.minPrice,
    searchParams
  ]);

  // Handler for location filter changes - User explicitly toggles/changes radius via UI
  const handleLocationFilterChange = useCallback((newLocationFilter) => {
    // Update local state for UI feedback
    setLocationFilter(newLocationFilter);

    // Reflect change in URL if location is *disabled* manually
    if (!newLocationFilter.enabled) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('latitude');
      params.delete('longitude');
      params.delete('radius');
      // Reset page to 1 when filters change significantly
      params.set('page', '1'); 
      router.push(`${window.location.pathname}?${params.toString()}`);
    } else if (newLocationFilter.location) {
       // If enabled manually (likely radius change), update URL
       const params = new URLSearchParams(searchParams.toString());
       params.set('latitude', newLocationFilter.location.latitude.toString());
       params.set('longitude', newLocationFilter.location.longitude.toString());
       params.set('radius', newLocationFilter.radius.toString());
       // Reset page to 1 when filters change significantly
       params.set('page', '1'); 
       router.push(`${window.location.pathname}?${params.toString()}`);
    }
    // Note: If location comes from store/URL, fetchData effect handles it.
    // This handler is mainly for direct user interaction with the NearbyProductsFilter.

  }, [searchParams, router]);

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
              Products {pagination.totalProducts > 0 ? `(${pagination.totalProducts})` : products.length > 0 ? `(${products.length})` : ""}
            </h1>
          </div>

          {/* Simplified Rendering Logic: Show products if the products state array is not empty */}
          {(() => {
            // Log the exact products array that should be rendered
            console.log(`RENDER: products state has ${products.length} items.`);

            if (products.length > 0) {
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {products.map((product) => {
                    // Add key validation log
                    if (!product || !product.id) {
                      console.error("Attempting to render product card without valid key/product:", product);
                      return null; // Don't render card if product or ID is invalid
                    }
                    console.log(`Rendering product card for ID: ${product.id}`);
                    return <ProductCard key={product.id} product={product} />;
                  })}
                </div>
              );
            } else if (!loading && !error) { // Only show "No products" if not loading and no error occurred
               // If location filter is on and results are empty, show specific message
               if (noNearbyResults) {
                 return <NoNearbyProductsMessage />;
               }
               // Otherwise, show generic "No products found"
               return (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">
                    No products found matching your criteria.
                  </p>
                  <button
                    onClick={() => {
                      setFilters({
                        category: "",
                        priceRange: [0, 10000], // Reset price range
                        sortBy: "latest",
                      });
                      setLocationFilter({
                        enabled: false,
                        location: null,
                        radius: 3,
                      });
                      // Optionally clear search params and reload or push state
                    }}
                    className="mt-4 text-primary hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              );
            }
            // If loading or error, those states are handled above this block
            return null;
          })()}
          
          {/* Pagination controls - only if more than one page */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => {
                      // Create a new URLSearchParams object from the current search params
                      const params = new URLSearchParams(searchParams.toString());
                      // Set the page parameter
                      params.set('page', page.toString()); // Ensure page is string
                      // Update the URL using router.push for client-side navigation
                      router.push(`${window.location.pathname}?${params.toString()}`);
                    }}
                    className={`px-3 py-1 rounded ${pagination.currentPage === page
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
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
