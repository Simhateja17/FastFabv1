"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import {
  FiPlus,
  FiChevronRight,
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiPackage,
  FiImage,
  FiList,
  FiTag,
} from "react-icons/fi";

export default function VariantGroupDetails({ params }) {
  const { id: groupId } = params;
  const router = useRouter();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantGroup, setVariantGroup] = useState(null);

  useEffect(() => {
    fetchVariantGroup();
  }, []);

  const fetchVariantGroup = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/products/variant-group/${groupId}`, {
        method: "GET",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch variant group");
      }
      
      const data = await response.json();
      setVariantGroup(data);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariant = async (productId) => {
    if (!confirm("Are you sure you want to delete this variant?")) {
      return;
    }
    
    try {
      const response = await authFetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete product variant");
      }
      
      toast.success("Variant deleted successfully");
      fetchVariantGroup();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 bg-background min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !variantGroup) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 bg-background min-h-screen">
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error || "Variant group not found"}
        </div>
        <Link
          href="/seller/products/variant-groups"
          className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 stroke-2" />
          Back to Variant Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-background min-h-screen">
      {/* Breadcrumb Nav */}
      <nav className="flex mb-8 text-sm overflow-x-auto whitespace-nowrap">
        <Link
          href="/seller/dashboard"
          className="text-text-muted hover:text-text"
        >
          Dashboard
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <Link
          href="/seller/products"
          className="text-text-muted hover:text-text"
        >
          Products
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <Link
          href="/seller/products/variant-groups"
          className="text-text-muted hover:text-text"
        >
          Variant Groups
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <span className="text-text-dark font-medium">{variantGroup.name}</span>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/seller/products/variant-groups")}
          className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 stroke-2" />
          Back to Variant Groups
        </button>
      </div>

      {/* Group Info Header */}
      <div className="bg-background-card rounded-lg shadow-md p-6 border border-ui-border mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-dark">{variantGroup.name}</h1>
            {variantGroup.description && (
              <p className="text-text-muted mt-1">{variantGroup.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {variantGroup.category && (
                <span className="text-sm bg-background-alt px-3 py-1 rounded-full">
                  {variantGroup.category}
                  {variantGroup.subcategory && ` / ${variantGroup.subcategory}`}
                </span>
              )}
              <span className="text-sm bg-background-alt px-3 py-1 rounded-full">
                Base Price: ₹{variantGroup.basePrice.toFixed(2)}
              </span>
              <span className="text-sm bg-background-alt px-3 py-1 rounded-full">
                Selling Price: ₹{variantGroup.sellingPrice.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link
              href={`/seller/products/variant-groups/edit/${variantGroup.id}`}
              className="bg-background-alt hover:bg-background-alt-light text-text-dark px-4 py-2 rounded-md transition-colors flex items-center border border-ui-border"
            >
              <FiEdit className="mr-2" />
              Edit Group
            </Link>
            <Link
              href={`/seller/products/variant-groups/${variantGroup.id}/add-variant`}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors flex items-center"
            >
              <FiPlus className="mr-2" />
              Add Variant
            </Link>
          </div>
        </div>
      </div>

      {/* Variants List */}
      <h2 className="text-xl font-semibold text-text-dark mb-4 flex items-center">
        <FiList className="mr-2" />
        Color Variants ({variantGroup.products.length})
      </h2>

      {variantGroup.products.length === 0 ? (
        <div className="bg-background-card rounded-lg shadow-md p-8 text-center border border-ui-border">
          <div className="flex justify-center mb-4">
            <FiPackage className="w-16 h-16 text-text-muted" />
          </div>
          <h3 className="text-xl font-medium text-text-dark mb-2">No Variants Added Yet</h3>
          <p className="text-text-muted mb-6">
            Start adding color variants to this product group.
          </p>
          <Link
            href={`/seller/products/variant-groups/${variantGroup.id}/add-variant`}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors inline-flex items-center"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Add First Variant
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {variantGroup.products.map((product) => {
            // Get the color info
            const colorInventory = product.colorInventory?.[0];
            
            return (
              <div
                key={product.id}
                className="bg-background-card rounded-lg shadow-md border border-ui-border overflow-hidden"
              >
                <div className="flex">
                  {/* Product Image */}
                  <div className="w-32 h-32 relative flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-background-alt flex items-center justify-center">
                        <FiImage className="w-8 h-8 text-text-muted" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-text-dark">{product.name}</h3>
                          {colorInventory && (
                            <div className="ml-2 flex items-center">
                              <div
                                className="w-4 h-4 rounded-full mr-1"
                                style={{ backgroundColor: colorInventory.colorCode || '#888888' }}
                              />
                              <span className="text-sm text-text-muted">{colorInventory.color}</span>
                            </div>
                          )}
                        </div>
                        
                        {colorInventory && colorInventory.stockNumber && (
                          <div className="flex items-center text-sm text-text-muted mt-1">
                            <FiTag className="mr-1" />
                            <span>{colorInventory.stockNumber}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm mt-1">
                          <span className="font-medium text-primary">₹{product.sellingPrice.toFixed(2)}</span>
                          {product.mrpPrice > product.sellingPrice && (
                            <span className="text-xs text-text-muted line-through ml-2">
                              ₹{product.mrpPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Link
                          href={`/seller/products/edit/${product.id}`}
                          className="text-text-muted hover:text-text-dark p-2 rounded-full transition-colors"
                          title="Edit Variant"
                        >
                          <FiEdit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteVariant(product.id)}
                          className="text-text-muted hover:text-red-500 p-2 rounded-full transition-colors"
                          title="Delete Variant"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Size inventory */}
                    {colorInventory && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-text-dark mb-1">Size Inventory:</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(colorInventory.inventory).map(([size, quantity]) => {
                            if (quantity > 0) {
                              return (
                                <div key={size} className="text-xs bg-background-alt px-2 py-1 rounded">
                                  {size}: {quantity}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Product Images */}
                {product.images && product.images.length > 1 && (
                  <div className="p-4 pt-0 border-t border-ui-border mt-2">
                    <div className="flex overflow-x-auto gap-2 py-2 -mx-2 px-2 scrollbar-thin">
                      {product.images.slice(1).map((image, idx) => (
                        <div key={idx} className="flex-shrink-0 w-16 h-16 relative rounded-md overflow-hidden border border-ui-border">
                          <Image
                            src={image}
                            alt={`${product.name} image ${idx + 2}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 