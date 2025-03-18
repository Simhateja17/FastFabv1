"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiSearch, FiShoppingBag } from "react-icons/fi";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import SellerBanner from "@/app/components/SellerBanner";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState({});
  const [categories, setCategories] = useState([]);

  // Fetch products on component mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const res = await fetch(PUBLIC_ENDPOINTS.ACTIVE_PRODUCTS, {
          cache: "no-store",
          next: { revalidate: 300 }, // Revalidate every 5 minutes
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch products: ${res.status}`);
        }

        const data = await res.json();
        setProducts(data);
        setFilteredProducts(data);

        // Group products by category
        const grouped = groupProductsByCategory(data);
        setGroupedProducts(grouped);
        setCategories(Object.keys(grouped));
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
        setFilteredProducts([]);
        setGroupedProducts({});
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(term.toLowerCase()) ||
          (product.category &&
            product.category.toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  };

  // Helper function to group products by category
  function groupProductsByCategory(products) {
    return products.reduce((acc, product) => {
      // Use "Uncategorized" if no category is set
      const category = product.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Seller Banner Modal */}
      <SellerBanner />

      {/* Hero Section */}
      <div className="bg-background-alt py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary">
              Welcome to Fast&Fab
            </h1>
            <p className="mt-4 text-xl text-text">
              Discover the latest fashion trends
            </p>

            {/* Search Bar */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search products..."
                  className="w-full p-3 pl-10 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                />
                <FiSearch className="absolute left-3 top-3.5 text-text-muted" />
              </div>
            </div>

            {/* Category Buttons */}
            {categories.length > 0 && (
              <div className="mt-8 flex justify-center gap-4 flex-wrap">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/products/category/${category.toLowerCase()}`}
                    className="inline-block bg-secondary text-white px-6 py-2 rounded-md hover:bg-secondary-dark transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products by Category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="large" color="secondary" />
          </div>
        ) : filteredProducts.length > 0 ? (
          searchTerm.trim() !== "" ? (
            // Search results view
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-8">
                Search Results
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ) : (
            // Category view
            categories.map((category) => (
              <section key={category}>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold text-primary">
                    {category}
                  </h2>
                  <Link
                    href={`/products/category/${category.toLowerCase()}`}
                    className="text-sm text-secondary hover:text-secondary-dark font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {groupedProducts[category].map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))
          )
        ) : (
          <div className="text-center py-12 bg-background-card rounded-lg shadow-sm">
            <FiShoppingBag className="w-12 h-12 mx-auto text-text-muted" />
            <h3 className="mt-4 text-lg font-medium text-text-dark">
              No Products Available
            </h3>
            <p className="mt-2 text-text-muted">
              {searchTerm.trim() !== ""
                ? "No products match your search. Try different keywords."
                : "Check back soon for our latest products!"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
