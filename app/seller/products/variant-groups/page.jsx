"use client";

import { useState, useEffect, useCallback } from "react";
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
  FiEye,
  FiPackage,
} from "react-icons/fi";

export default function VariantGroups() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantGroups, setVariantGroups] = useState([]);

  const fetchVariantGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/products/variant-groups", {
        method: "GET",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch variant groups");
      }
      
      const data = await response.json();
      setVariantGroups(data);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchVariantGroups();
  }, [fetchVariantGroups]);

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Are you sure you want to delete this variant group and all its products?")) {
      return;
    }
    
    try {
      const response = await authFetch(`/api/products/variant-group/${groupId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete variant group");
      }
      
      toast.success("Variant group deleted successfully");
      fetchVariantGroups();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-background min-h-screen">
      {/* Breadcrumb Nav */}
      <nav className="flex mb-8 text-sm">
        <Link href="/seller/dashboard" className="text-text-muted hover:text-text">
          Dashboard
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <Link href="/seller/products" className="text-text-muted hover:text-text">
          Products
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <span className="text-text-dark font-medium">Variant Groups</span>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/seller/products")}
          className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 stroke-2" />
          Back to Products
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-dark">Product Variant Groups</h1>
        <Link
          href="/seller/products/variant-groups/add"
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors flex items-center"
        >
          <FiPlus className="w-5 h-5 mr-2" />
          Create New Group
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      ) : variantGroups.length === 0 ? (
        <div className="bg-background-card rounded-lg shadow-md p-8 text-center border border-ui-border">
          <div className="flex justify-center mb-4">
            <FiPackage className="w-16 h-16 text-text-muted" />
          </div>
          <h2 className="text-xl font-medium text-text-dark mb-2">No Variant Groups Found</h2>
          <p className="text-text-muted mb-6">
            Create a variant group to manage products with multiple colors or variations.
          </p>
          <Link
            href="/seller/products/variant-groups/add"
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors inline-flex items-center"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Create First Variant Group
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {variantGroups.map((group) => (
            <div
              key={group.id}
              className="bg-background-card rounded-lg shadow-md p-6 border border-ui-border"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-medium text-text-dark mb-1">{group.name}</h2>
                  {group.description && (
                    <p className="text-text-muted mb-2 line-clamp-1">{group.description}</p>
                  )}
                  <div className="flex items-center text-sm text-text-muted mb-2">
                    <span className="font-medium">Base Price: ₹{group.basePrice.toFixed(2)}</span>
                    <span className="mx-2">•</span>
                    <span className="font-medium">Selling Price: ₹{group.sellingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center text-sm text-text-muted">
                    {group.category && (
                      <>
                        <span>{group.category}</span>
                        {group.subcategory && (
                          <>
                            <span className="mx-1">/</span>
                            <span>{group.subcategory}</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <span className="text-sm bg-primary bg-opacity-10 text-primary px-2 py-1 rounded">
                    {group.products?.length || 0} Variants
                  </span>
                  
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/seller/products/variant-groups/${group.id}`}
                      className="text-text-muted hover:text-text-dark p-2 rounded-full transition-colors"
                      title="View Details"
                    >
                      <FiEye className="w-5 h-5" />
                    </Link>
                    <Link
                      href={`/seller/products/variant-groups/edit/${group.id}`}
                      className="text-text-muted hover:text-text-dark p-2 rounded-full transition-colors"
                      title="Edit Group"
                    >
                      <FiEdit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-text-muted hover:text-red-500 p-2 rounded-full transition-colors"
                      title="Delete Group"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Preview of variant products if any */}
              {group.products && group.products.length > 0 && (
                <div className="mt-4 border-t border-ui-border pt-4">
                  <div className="flex overflow-x-auto gap-3 py-2 -mx-2 px-2 scrollbar-thin">
                    {group.products.map((product) => (
                      <div key={product.id} className="flex-shrink-0 w-16 relative">
                        {product.images && product.images.length > 0 ? (
                          <div className="relative h-16 w-16 rounded-md overflow-hidden border border-ui-border">
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 bg-background-alt rounded-md flex items-center justify-center border border-ui-border">
                            <FiPackage className="w-6 h-6 text-text-muted" />
                          </div>
                        )}
                        
                        {product.colorInventory && product.colorInventory.length > 0 && (
                          <div 
                            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-white" 
                            style={{ 
                              backgroundColor: product.colorInventory[0].colorCode || '#888888',
                            }}
                            title={product.colorInventory[0].color}
                          />
                        )}
                      </div>
                    ))}
                    
                    <Link
                      href={`/seller/products/variant-groups/${group.id}/add-variant`}
                      className="flex-shrink-0 h-16 w-16 bg-background-alt rounded-md flex items-center justify-center border border-ui-border hover:bg-background-alt-light transition-colors"
                      title="Add Variant"
                    >
                      <FiPlus className="w-6 h-6 text-text-muted" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 