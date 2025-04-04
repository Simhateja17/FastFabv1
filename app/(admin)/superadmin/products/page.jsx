"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import getAdminApiClient from "@/app/utils/apiClient";
import { toast } from "react-hot-toast";
import Image from 'next/image';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const router = useRouter();

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Get API client with admin authorization
        const apiClient = getAdminApiClient();

        // Fetch products data from the API
        const response = await apiClient.get("/api/admin/products");

        // Handle different response formats
        if (response.data) {
          let productsData = [];

          // Check if response data is an array or has a products property
          if (Array.isArray(response.data)) {
            productsData = response.data;
          } else if (Array.isArray(response.data.products)) {
            productsData = response.data.products;
          } else {
            console.error("Invalid response format:", response.data);
            setError("Invalid response format from API");
            setLoading(false);
            return;
          }

          setProducts(productsData);

          // Extract unique categories
          const uniqueCategories = [
            ...new Set(
              productsData.map((product) => product.category).filter(Boolean)
            ),
          ];
          setCategories(uniqueCategories);
        } else {
          console.error("Empty response data");
          setError("Empty response from API");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setError(error.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search query, status, and category
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.seller.shopName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && product.isActive) ||
      (statusFilter === "inactive" && !product.isActive);

    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Toggle product status (active/inactive)
  const toggleProductStatus = async (productId) => {
    try {
      // Find the product
      const productIndex = products.findIndex((p) => p.id === productId);
      if (productIndex === -1) return;

      // Get current status
      const currentStatus = products[productIndex].isActive;
      const newStatus = !currentStatus;

      // Get API client
      const apiClient = getAdminApiClient();

      // Update status via API
      await apiClient.patch(`/api/admin/products/${productId}`, {
        isActive: newStatus,
      });

      // Create a copy of the products array and update the status
      const updatedProducts = [...products];
      updatedProducts[productIndex] = {
        ...updatedProducts[productIndex],
        isActive: newStatus,
      };

      // Update state
      setProducts(updatedProducts);
      toast.success(
        `Product ${newStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Error toggling product status:", error);
      toast.error("Failed to update product status");
    }
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      // Get API client
      const apiClient = getAdminApiClient();

      // Delete product via API
      await apiClient.delete(`/api/admin/products/${selectedProduct.id}`);

      // Update state
      setProducts(
        products.filter((product) => product.id !== selectedProduct.id)
      );
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  // View product details
  const viewProductDetails = (productId) => {
    router.push(`/superadmin/products/${productId}`);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text">Products</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 rounded-lg border border-ui-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-text-muted"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label
            htmlFor="status-filter"
            className="block text-sm font-medium text-text-muted mb-1"
          >
            Status
          </label>
          <select
            id="status-filter"
            className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex-1">
          <label
            htmlFor="category-filter"
            className="block text-sm font-medium text-text-muted mb-1"
          >
            Category
          </label>
          <select
            id="category-filter"
            className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-background-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ui-border">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-background-card divide-y divide-ui-border">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 relative rounded-md overflow-hidden bg-background-alt">
                          <Image
                            className="object-cover"
                            src={
                              product.images?.[0] ||
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40' fill='%23eee'%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23aaa'%3ENoImg%3C/text%3E%3C/svg%3E"
                            }
                            alt={product.name || 'Product image'}
                            fill
                            sizes="40px"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-text">
                            {product.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {product.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        ₹{product.sellingPrice}
                      </div>
                      <div className="text-xs text-text-muted line-through">
                        ₹{product.mrp}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        {product.stock} units
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        <Link
                          href={`/superadmin/sellers/${product.seller?.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          {product.seller?.shopName || "Unknown"}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewProductDetails(product.id)}
                        className="text-primary hover:text-primary-dark mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => toggleProductStatus(product.id)}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        {product.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-4 text-center text-text-muted"
                  >
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-background-card p-6 rounded-lg shadow-lg max-w-md mx-auto">
            <h3 className="text-lg font-medium text-text mb-4">
              Confirm Delete
            </h3>
            <p className="text-text-muted mb-6">
              Are you sure you want to delete{" "}
              <span className="font-medium text-text">
                {selectedProduct?.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
