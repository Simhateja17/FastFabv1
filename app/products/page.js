"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/app/components/ProductCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    size: "",
  });

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products?${queryParams}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
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
      {/* Filters */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded-md"
        >
          <option value="">All Categories</option>
          <option value="MEN">Men</option>
          <option value="WOMEN">Women</option>
        </select>
        {filters.category && (
          <select
            name="subcategory"
            value={filters.subcategory}
            onChange={handleFilterChange}
            className="p-2 border border-gray-300 rounded-md"
          >
            <option value="">All Subcategories</option>
            {filters.category === "MEN"
              ? ["T-shirts", "Shirts", "Trousers", "Jeans"].map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))
              : ["Dresses", "Tops", "Skirts", "Jeans"].map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
          </select>
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
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
  );
}
