"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag } from "react-icons/fi";
import ProductFilters from "@/app/components/ProductFilters";

export default function MenProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: "MEN", // Default to MEN category
    subcategory: "",
    size: "",
    minPrice: null,
    maxPrice: null,
    sort: "",
  });

  useEffect(() => {
    fetchProducts();
  }, [filters, fetchProducts]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create basic query params - we'll fetch all men's products and filter client-side
      const queryParams = new URLSearchParams();
      queryParams.append("category", filters.category); // Always include MEN category

      const response = await fetch(
        `${PUBLIC_ENDPOINTS.PRODUCTS}?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      let data = await response.json();

      // Ensure we only have MEN products
      let filteredProducts = data.filter(
        (product) => product.category === "MEN" || product.category === "Men"
      );

      // Apply subcategory filter if selected
      if (filters.subcategory) {
        filteredProducts = filteredProducts.filter(
          (product) =>
            product.subcategory &&
            product.subcategory.toLowerCase() ===
              filters.subcategory.toLowerCase()
        );
      }

      // Apply size filter if selected
      if (filters.size) {
        filteredProducts = filteredProducts.filter(
          (product) =>
            product.sizeQuantities &&
            product.sizeQuantities[filters.size] &&
            product.sizeQuantities[filters.size] > 0
        );
      }

      // Apply client-side filtering for price if needed
      if (filters.minPrice !== null || filters.maxPrice !== null) {
        filteredProducts = filteredProducts.filter((product) => {
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
            case "price_asc":
              return Number(a.sellingPrice) - Number(b.sellingPrice);
            case "price_desc":
              return Number(b.sellingPrice) - Number(a.sellingPrice);
            case "newest":
              return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            case "popular":
              // If you have popularity metrics like views or sales, use them here
              return 0;
            default:
              return 0;
          }
        });
      }

      setProducts(filteredProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
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
        Men&apos;s Collection
      </h1>

      {/* New ProductFilters component with fixed category */}
      <ProductFilters
        filters={filters}
        setFilters={setFilters}
        availableCategories={["MEN"]} // Only show MEN category
      />

      {/* Products Grid */}
      {products.length > 0 ? (
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
            Try adjusting your filters or check back later
          </p>
        </div>
      )}
    </div>
  );
}
