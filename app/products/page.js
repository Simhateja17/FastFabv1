"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import ProductFilters from "@/app/components/ProductFilters";
import NearbyProductsFilter from '@/app/components/NearbyProductsToggle';
import NoNearbyProductsMessage from '@/app/components/NoNearbyProductsMessage';

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

  useEffect(() => {
    fetchProducts();
  }, [filters, locationFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoNearbyResults(false);
      
      // Create query params with both API and client-side filters
      const queryParams = new URLSearchParams();
      
      // Add all filter params to see if the API is respecting them
      if (filters.category) queryParams.append("category", filters.category);
      if (filters.minPrice !== null) queryParams.append("minPrice", filters.minPrice);
      if (filters.maxPrice !== null) queryParams.append("maxPrice", filters.maxPrice);
      
      // Add location parameters if location is available
      const hasLocationData = locationFilter.enabled && 
        locationFilter.location && 
        locationFilter.location.latitude && 
        locationFilter.location.longitude;
      
      if (hasLocationData) {
        queryParams.append("latitude", locationFilter.location.latitude);
        queryParams.append("longitude", locationFilter.location.longitude);
        queryParams.append("radius", locationFilter.radius);
      }
      
      // Use nearby endpoint if location is available
      const endpoint = hasLocationData 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/products/nearby` 
        : PUBLIC_ENDPOINTS.PRODUCTS;
      
      const response = await fetch(
        `${endpoint}?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      let data = await response.json();
      
      // Check if we're using the location API and got an empty result
      if (hasLocationData && data.isLocationFilter && data.products.length === 0) {
        setNoNearbyResults(true);
        return;
      }
      
      // Extract products array if using new API format
      let productList = Array.isArray(data) ? data : (data.products || []);
      
      // Apply client-side filtering that's not handled by the API
      if (filters.subcategory) {
        productList = productList.filter(
          product => 
            product.subcategory && 
            product.subcategory.toLowerCase() === filters.subcategory.toLowerCase()
        );
      }
      
      if (filters.size) {
        productList = productList.filter(
          product => 
            product.sizeQuantities && 
            product.sizeQuantities[filters.size] && 
            product.sizeQuantities[filters.size] > 0
        );
      }
      
      // Apply client-side filtering for price and sorting if needed
      if (filters.minPrice !== null || filters.maxPrice !== null) {
        const originalProductCount = productList.length;
        const filteredProductList = [];
        
        // Log the filter state being used for this filtering pass
        console.log(`[Filtering] Applying price filter: min=${filters.minPrice}, max=${filters.maxPrice}`);

        for (const product of productList) {
          const rawPrice = product.sellingPrice;
          const price = normalizePrice(rawPrice);
          let shouldInclude = true; // Default to include unless filtered out

          // Apply price filter criteria
          if (filters.minPrice !== null && filters.maxPrice !== null) {
            shouldInclude = price >= filters.minPrice && price < filters.maxPrice;
          } else if (filters.minPrice !== null) {
            shouldInclude = price >= filters.minPrice;
          } else if (filters.maxPrice !== null) {
            shouldInclude = price < filters.maxPrice;
          }
          
          // Specific logging for the problematic 5000+ filter
          if (filters.minPrice === 5000 && filters.maxPrice === null) {
            if (!shouldInclude) {
               console.log(`[Filtering ₹5000+] EXCLUDED: Name='${product.name}', ID='${product.id}', RawPrice='${rawPrice}', NormalizedPrice=${price}`);
            }
            // Keep this explicit check for clarity in logs
            if (price < 5000) { 
              shouldInclude = false; // Re-affirm exclusion
            }
          }

          if (shouldInclude) {
            filteredProductList.push(product);
          } else {
             // Generic log for any exclusion if needed (can be noisy)
             // console.log(`[Filtering] EXCLUDED Product ID ${product.id}, Price ${price}`);
          }
        }
        
        // Log the final list before setting state
        console.log(`[Filtering] FINAL CHECK before setProducts (${filteredProductList.length} items):`, 
          filteredProductList.map(p => ({ id: p.id, name: p.name, price: normalizePrice(p.sellingPrice) }))
        );
        
        productList = filteredProductList;
        console.log(`[Filtering] Price filtering result: ${originalProductCount} -> ${productList.length} products`);
      }
      
      // Apply sorting
      if (filters.sort) {
        productList = [...productList].sort((a, b) => {
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
      
      // If using location filter, ensure products are sorted by distance first
      if (hasLocationData && !filters.sort) {
        productList.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
      
      setProducts(productList);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler for location filter changes
  const handleLocationFilterChange = (newLocationFilter) => {
    setLocationFilter(newLocationFilter);
  };

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
      
      {/* Debug panel for development */}
      {process.env.NODE_ENV === 'development' && (
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
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with filters */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <NearbyProductsFilter onChange={handleLocationFilterChange} />
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
