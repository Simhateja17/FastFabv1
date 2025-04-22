"use client";

import { useState, useEffect, useCallback } from "react";
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
  FiChevronRight
} from "react-icons/fi";
import { PRODUCT_ENDPOINTS } from "@/app/config";
//hi
// The actual products list content
function ProductsListContent({ seller }) {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  const fetchProducts = useCallback(async (page = 1) => {
    if (!seller?.id) {
      console.warn('[ProductsPage:fetchProducts] Called without seller ID. Aborting.');
      setLoading(false);
      return;
    }
    
    console.log(`[ProductsPage:fetchProducts] Called for seller ${seller.id}, page ${page}`);
    setLoading(true);
    try {
      const timestamp = Date.now();
      const productsApiEndpoint = `/api/seller/products?_=${timestamp}&page=${page}`;
      console.log(`Fetching products from: ${productsApiEndpoint}`);

      const data = await authFetch(productsApiEndpoint);
      
      if (!data || !Array.isArray(data.products)) {
          console.error("Invalid product data received:", data);
          throw new Error("Received invalid product data from server.");
      }

      console.log(`Received ${data.products.length} products`);

      setProducts(data.products);

    } catch (error) {
      console.error("Product fetch error:", error);
      toast.error(`Error fetching products: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [authFetch, seller?.id]);

  useEffect(() => {
    console.log(`[ProductsPage Effect] Running. Seller prop ID: ${seller?.id}`);
    if (seller?.id) {
      console.log(`[ProductsPage Effect] Valid seller ID (${seller.id}) found, calling fetchProducts.`);
      fetchProducts(1);
    } else {
      console.warn('[ProductsPage Effect] Running but seller prop is missing or invalid.');
    }
  }, [seller?.id]);

  useEffect(() => {
    const handleStorageChange = () => {
      const lastUpdate = localStorage.getItem('product_list_updated');
      if (lastUpdate && seller?.id) {
        console.log('Product list updated flag detected, refreshing...');
        fetchProducts(1);
        localStorage.removeItem('product_list_updated');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchProducts, seller?.id]);

  const handleDelete = async (productId) => {
     if (!seller?.id) {
         toast.error("Cannot delete product: Seller information missing.");
         return;
     }
     if (!window.confirm("Are you sure?")) return;

     console.log(`Deleting product ${productId} for seller ${seller.id}`);
     try {
        const deleteApiEndpoint = `/api/seller/products/${productId}`;
        const response = await authFetch(deleteApiEndpoint, { method: "DELETE" });
        
        if (response.deactivated) {
            toast.success("Product deactivated (referenced in orders).");
        } else {
            toast.success("Product deleted successfully.");
        }
        fetchProducts();
     } catch (error) {
         console.error("Error deleting product:", error);
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
              className="bg-secondary px-4 py-2 rounded-md hover:bg-secondary-dark transition-colors flex items-center shadow-sm"
            >
              <FiPlus className="mr-2 text-black" />
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
                className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-md bg-secondary hover:bg-secondary-dark transition-colors"
              >
                <FiPlus className="mr-2 text-black" />
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
                          className="px-2 py-1 text-xs bg-secondary rounded hover:bg-secondary-dark transition-colors flex items-center"
                        >
                          <FiEdit2 className="mr-1 w-3 h-3 text-black" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-2 py-1 text-xs bg-error rounded hover:bg-error-dark transition-colors flex items-center"
                        >
                          <FiTrash2 className="mr-1 w-3 h-3 text-black" />
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
                    
                    // Debug log to check what sizes are actually in the product
                    console.log(`Product ${product.id} sizes:`, product.sizeQuantities);
                    console.log(`Available sizes for ${product.name}:`, availableSizes);

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
                              <FiEdit2 className="w-4 h-4 text-black" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 bg-error bg-opacity-10 text-error rounded-md hover:bg-opacity-20 transition-colors"
                              title="Delete Product"
                            >
                              <FiTrash2 className="w-4 h-4 text-black" />
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
      {(sellerFromProtectedRoute) => {
        console.log(`[ProductsList] Rendering content. Received seller ID from ProtectedRoute: ${sellerFromProtectedRoute?.id}`);
        return <ProductsListContent seller={sellerFromProtectedRoute} />;
      }}
    </ProtectedRoute>
  );
}
