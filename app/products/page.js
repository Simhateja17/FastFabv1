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
      
      // If category is selected, add it to the API query
      if (filters.category) queryParams.append("category", filters.category);
      
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
        productList = productList.filter(product => {
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
