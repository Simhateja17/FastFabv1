"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import {
  FiPackage,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiImage,
  FiBox,
  FiChevronRight,
} from "react-icons/fi";

// The actual products list content
function ProductsListContent() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error("Error fetching products: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      toast.success("Product deleted successfully");
      fetchProducts(); // Refresh the list
    } catch (error) {
      toast.error("Error deleting product: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-background-alt border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm text-text-muted">
            <Link href="/seller/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <FiChevronRight className="mx-2 text-primary" />
            <span className="text-text-dark">Products</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-text-dark flex items-center">
            <span className="bg-secondary bg-opacity-20 text-secondary p-2 rounded-full mr-3">
              <FiPackage className="w-6 h-6 stroke-2 text-white" />
            </span>
            Your Products
          </h1>
          <Link
            href="/seller/products/add"
            className="bg-secondary px-4 py-2 text-white rounded-md hover:bg-secondary-dark transition-colors flex items-center shadow-sm"
          >
            <FiPlus className="mr-2 text-white" />
            Add New Product
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 bg-background-card rounded-lg shadow-md border border-ui-border">
            <FiBox className="mx-auto h-12 w-12 text-text-muted" />
            <h3 className="mt-2 text-lg font-medium text-text-dark">
              No products found
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Get started by creating a new product.
            </p>
            <div className="mt-6">
              <Link
                href="/seller/products/add"
                className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-secondary hover:bg-secondary-dark transition-colors"
              >
                <FiPlus className="mr-2" />
                Add Product
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-background-card rounded-lg shadow-md border border-ui-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square relative">
                  {product.images && product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-background-alt flex items-center justify-center">
                      <FiImage className="w-12 h-12 text-white" />
                    </div>
                  )}
                  {product.mrpPrice > product.sellingPrice && (
                    <div className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-1 rounded-full">
                      {Math.round(
                        ((product.mrpPrice - product.sellingPrice) /
                          product.mrpPrice) *
                          100
                      )}
                      % OFF
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-medium text-text-dark truncate">
                    {product.name}
                  </h3>
                  <div className="mt-1 flex items-center">
                    <span className="text-xs bg-primary bg-opacity-10 text-white rounded-full px-2 py-0.5 mr-1">
                      {product.category}
                    </span>
                    <span className="text-xs bg-background-alt text-text-muted rounded-full px-2 py-0.5">
                      {product.subcategory}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-md font-bold text-primary">
                        ₹{product.sellingPrice}
                      </p>
                      {product.mrpPrice > product.sellingPrice && (
                        <p className="text-xs text-text-muted line-through">
                          ₹{product.mrpPrice}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          router.push(`/seller/products/edit/${product.id}`)
                        }
                        className="p-2 bg-secondary bg-opacity-10 text-secondary rounded-full hover:bg-opacity-20 transition-colors flex items-center justify-center"
                        title="Edit Product"
                      >
                        <FiEdit2 className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 bg-error bg-opacity-10 text-error rounded-full hover:bg-opacity-20 transition-colors flex items-center justify-center"
                        title="Delete Product"
                      >
                        <FiTrash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Available sizes summary */}
                  {product.sizeQuantities && (
                    <div className="mt-3 pt-3 border-t border-ui-border">
                      <p className="text-xs text-text-muted mb-1">
                        Available Sizes:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(product.sizeQuantities)
                          .filter(([_, qty]) => qty > 0)
                          .map(([size]) => (
                            <span
                              key={size}
                              className="text-xs bg-background-alt text-text-dark px-2 py-0.5 rounded"
                            >
                              {size}
                            </span>
                          ))}
                        {Object.values(product.sizeQuantities || {}).every(
                          (qty) => qty === 0
                        ) && (
                          <span className="text-xs text-error">
                            Out of stock
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap the products list content with the ProtectedRoute component
export default function ProductsList() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <ProductsListContent />
    </ProtectedRoute>
  );
}
