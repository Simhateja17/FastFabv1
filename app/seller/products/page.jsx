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
import { PRODUCT_ENDPOINTS } from "@/app/config";

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
      const backendApiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000/api'; // Define backend URL
      
      // Call the correct backend endpoint directly
      console.log(`Fetching products from: ${backendApiUrl}/products`); // Add log
      const response = await authFetch(
        `${backendApiUrl}/products` // Corrected endpoint
      );

      // Check if response is not OK
      if (!response.ok) {
        // Check for HTML responses
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error("Server error occurred. Please try again later.");
        }
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if the response contains the products array
      const productsArray = data.products || [];
      console.log(`Received ${productsArray.length} products`); // Add log

      // Fetch color inventories for each product
      const productsWithColors = await Promise.all(
        productsArray.map(async (product) => {
          try {
            // Use correct backend URL for fetching colors
            console.log(`Fetching colors for product ${product.id} from: ${backendApiUrl}/products/${product.id}/colors`); // Add log
            const colorResponse = await authFetch(
              `${backendApiUrl}/products/${product.id}/colors` // Corrected endpoint
            );

            if (colorResponse.ok) {
              const colorData = await colorResponse.json();
              return {
                ...product,
                colorInventories: colorData.colorInventories || [],
              };
            }
            console.warn(`Failed to fetch colors for product ${product.id}: ${colorResponse.status}`); // Add log
            return product; // Return product even if colors fail
          } catch (error) {
            console.error(
              `Error fetching colors for product ${product.id}:`,
              error
            );
            return product; // Return product even if colors fail
          }
        })
      );

      setProducts(productsWithColors);
    } catch (error) {
      console.error("Product fetch error:", error);
      toast.error(error.message || "Error fetching products");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000/api'; // Define backend URL
      
      // Use correct backend URL for deleting product
      console.log(`Deleting product ${productId} at: ${backendApiUrl}/products/${productId}`); // Add log
      const response = await authFetch(
        `${backendApiUrl}/products/${productId}`, // Corrected endpoint
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        // Try parsing error response
        let errorMsg = "Failed to delete product";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(errorMsg);
      }

      // Parse the response to check if it was actually deleted or just deactivated
      const result = await response.json();
      
      if (result.deactivated) {
        toast.success("Product has been deactivated because it is referenced in orders");
      } else {
        toast.success("Product deleted successfully");
      }
      
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error("Error deleting product:", error); // Add log
      toast.error(`Error deleting product: ${error.message}`);
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/seller/products/add"
              className="bg-secondary px-4 py-2 text-white rounded-md hover:bg-secondary-dark transition-colors flex items-center shadow-sm"
            >
              <FiPlus className="mr-2 text-white" />
              Add New Product
            </Link>
          </div>
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
          <>
            {/* Mobile view (card style) - Only visible on small screens */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-background-card rounded-lg shadow-sm border border-ui-border overflow-hidden"
                >
                  <div className="flex">
                    <div className="w-24 h-24 relative">
                      {product.images && product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-background-alt flex items-center justify-center">
                          <FiImage className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-3">
                      <h3 className="text-md font-medium text-text-dark truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center text-sm text-text-muted mt-1">
                        <span className="font-medium text-primary">
                          ₹{product.sellingPrice}
                        </span>
                        {product.mrpPrice > product.sellingPrice && (
                          <span className="text-xs text-text-muted line-through ml-2">
                            ₹{product.mrpPrice}
                          </span>
                        )}
                      </div>
                      <div className="flex mt-2 space-x-2">
                        <button
                          onClick={() =>
                            router.push(`/seller/products/edit/${product.id}`)
                          }
                          className="px-2 py-1 text-xs bg-secondary text-white rounded hover:bg-secondary-dark transition-colors flex items-center"
                        >
                          <FiEdit2 className="mr-1 w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-2 py-1 text-xs bg-error text-white rounded hover:bg-error-dark transition-colors flex items-center"
                        >
                          <FiTrash2 className="mr-1 w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop view (table style) - Only visible on medium screens and above */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-ui-border">
                <thead className="bg-background-alt">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-16"
                    >
                      Image
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                    >
                      Product
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                    >
                      Price
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                    >
                      Variants
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                    >
                      Inventory
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background-card divide-y divide-ui-border">
                  {products.map((product) => {
                    // Calculate total inventory across all sizes and colors
                    let totalInventory = 0;

                    if (
                      product.colorInventories &&
                      product.colorInventories.length > 0
                    ) {
                      // Sum up all color inventories
                      product.colorInventories.forEach((colorInv) => {
                        Object.values(colorInv.inventory || {}).forEach(
                          (qty) => {
                            totalInventory += parseInt(qty) || 0;
                          }
                        );
                      });
                    } else if (product.sizeQuantities) {
                      // Sum up size quantities
                      totalInventory = Object.values(
                        product.sizeQuantities
                      ).reduce((sum, qty) => sum + parseInt(qty), 0);
                    }

                    // Get available colors
                    const availableColors = (
                      product.colorInventories || []
                    ).filter((colorInv) =>
                      Object.values(colorInv.inventory || {}).some(
                        (qty) => parseInt(qty) > 0
                      )
                    );

                    // Get available sizes
                    const availableSizes = Object.entries(
                      product.sizeQuantities || {}
                    )
                      .filter(([_, qty]) => parseInt(qty) > 0)
                      .map(([size]) => size);

                    return (
                      <tr key={product.id} className="hover:bg-background-alt">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="h-12 w-12 relative rounded-md overflow-hidden">
                            {product.images && product.images[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-background-alt flex items-center justify-center">
                                <FiImage className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-text-dark">
                            {product.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            ID: {product.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs bg-primary bg-opacity-10 text-white rounded-full px-2 py-0.5 inline-block">
                            {product.category}
                          </div>
                          {product.subcategory && (
                            <div className="text-xs bg-background-alt text-text-muted rounded-full px-2 py-0.5 inline-block mt-1">
                              {product.subcategory}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-primary">
                            ₹{product.sellingPrice}
                          </div>
                          {product.mrpPrice > product.sellingPrice && (
                            <div className="text-xs text-text-muted line-through">
                              ₹{product.mrpPrice}
                              <span className="text-accent ml-1 no-underline">
                                {Math.round(
                                  ((product.mrpPrice - product.sellingPrice) /
                                    product.mrpPrice) *
                                    100
                                )}
                                % OFF
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {/* Colors */}
                          {availableColors.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {availableColors.map((colorInv, index) => (
                                <div
                                  key={colorInv.color}
                                  className="w-4 h-4 rounded-full border border-ui-border"
                                  style={{
                                    backgroundColor:
                                      colorInv.colorCode || "#000000",
                                  }}
                                  title={colorInv.color}
                                ></div>
                              ))}
                              {availableColors.length > 5 && (
                                <span className="text-xs text-text-muted">
                                  +{availableColors.length - 5} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Sizes */}
                          {availableSizes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {availableSizes.slice(0, 5).map((size) => (
                                <span
                                  key={size}
                                  className="text-xs bg-background-alt text-text-dark px-1.5 py-0.5 rounded"
                                >
                                  {size}
                                </span>
                              ))}
                              {availableSizes.length > 5 && (
                                <span className="text-xs text-text-muted">
                                  +{availableSizes.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div
                            className={`text-sm font-medium ${
                              totalInventory > 10
                                ? "text-success"
                                : totalInventory > 0
                                ? "text-warning"
                                : "text-error"
                            }`}
                          >
                            {totalInventory > 0
                              ? `${totalInventory} units`
                              : "Out of stock"}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/seller/products/edit/${product.id}`
                                )
                              }
                              className="p-2 bg-secondary bg-opacity-10 text-secondary rounded-md hover:bg-opacity-20 transition-colors"
                              title="Edit Product"
                            >
                              <FiEdit2 className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 bg-error bg-opacity-10 text-error rounded-md hover:bg-opacity-20 transition-colors"
                              title="Delete Product"
                            >
                              <FiTrash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
