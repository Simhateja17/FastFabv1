"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

// API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProductDetailPage({ params }) {
  const productId = params.id;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const router = useRouter();

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/admin/products/${productId}`
        );
        setProduct(response.data);
        setFormData({
          name: response.data.name || "",
          description: response.data.description || "",
          sellingPrice: response.data.sellingPrice || 0,
          mrpPrice: response.data.mrpPrice || 0,
          isActive: response.data.isActive || false,
          category: response.data.category || "",
          subcategory: response.data.subcategory || "",
          stock: response.data.stock || 0,
          images: response.data.images || [],
          // Add more fields as needed
        });
      } catch (error) {
        console.error("Error fetching product data:", error);
        setError(
          error.response?.data?.message || "Failed to load product details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  // Handle form data change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle number input change
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseFloat(value) || 0,
    });
  };

  // Save product data
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/admin/products/${productId}`,
        formData
      );
      setProduct(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating product:", error);
      setSaveError(
        error.response?.data?.message || "Failed to update product details"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      name: product.name || "",
      description: product.description || "",
      sellingPrice: product.sellingPrice || 0,
      mrpPrice: product.mrpPrice || 0,
      isActive: product.isActive || false,
      category: product.category || "",
      subcategory: product.subcategory || "",
      stock: product.stock || 0,
      images: product.images || [],
    });
    setIsEditing(false);
    setSaveError(null);
  };

  // Handle image URL change
  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({
      ...formData,
      images: newImages,
    });
  };

  // Add new image URL
  const addImage = () => {
    setFormData({
      ...formData,
      images: [...formData.images, ""],
    });
  };

  // Remove image URL
  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({
      ...formData,
      images: newImages,
    });
  };

  // Toggle product status
  const toggleProductStatus = async () => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/products/${productId}/toggle-status`,
        {
          isActive: !product.isActive,
        }
      );
      setProduct({ ...product, isActive: !product.isActive });
    } catch (error) {
      console.error("Error toggling product status:", error);
      alert(error.response?.data?.message || "Failed to update product status");
    }
  };

  // Discount calculation
  const calculateDiscount = () => {
    if (!product || !product.mrpPrice || !product.sellingPrice) return 0;
    if (product.mrpPrice <= product.sellingPrice) return 0;

    return Math.round(
      ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <Link
          href="/admin/superadmin/products"
          className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            href="/admin/superadmin/products"
            className="inline-flex items-center text-primary hover:text-primary-dark mb-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-text">{product.name}</h1>
          <p className="text-text-muted">ID: {product.id}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={toggleProductStatus}
            className={`px-4 py-2 rounded ${
              product.isActive
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {product.isActive ? "Active" : "Inactive"}
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              Edit Product
            </button>
          ) : (
            <div className="space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-ui-border text-text rounded hover:bg-background-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Images */}
        <div className="lg:col-span-1">
          <div className="bg-background-card rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-text mb-4">
              Product Images
            </h3>
            {isEditing ? (
              <div className="space-y-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Image URL"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={addImage}
                  className="w-full px-4 py-2 mt-2 text-sm text-primary border border-primary rounded-md hover:bg-primary hover:text-white transition-colors"
                  type="button"
                >
                  Add Image
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {product.images && product.images.length > 0 ? (
                  product.images.map((image, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-background-alt rounded-md overflow-hidden relative"
                    >
                      <img
                        src={image}
                        alt={`${product.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://via.placeholder.com/300x300?text=Image+Not+Found";
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="aspect-square bg-background-alt rounded-md flex items-center justify-center">
                    <p className="text-text-muted">No images available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="lg:col-span-2">
          <div className="bg-background-card rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-text mb-4">
              Product Details
            </h3>
            {isEditing ? (
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium text-text-muted mb-3">
                      Basic Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Product Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="description"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows="3"
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h4 className="text-md font-medium text-text-muted mb-3">
                      Pricing
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="sellingPrice"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Selling Price (₹)
                        </label>
                        <input
                          type="number"
                          id="sellingPrice"
                          name="sellingPrice"
                          value={formData.sellingPrice}
                          onChange={handleNumberChange}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="mrpPrice"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          MRP Price (₹)
                        </label>
                        <input
                          type="number"
                          id="mrpPrice"
                          name="mrpPrice"
                          value={formData.mrpPrice}
                          onChange={handleNumberChange}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="stock"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          id="stock"
                          name="stock"
                          value={formData.stock}
                          onChange={handleNumberChange}
                          min="0"
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <h4 className="text-md font-medium text-text-muted mb-3">
                      Categories
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="category"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Category
                        </label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select Category</option>
                          {[
                            "MEN",
                            "WOMEN",
                            "KIDS",
                            "ACCESSORIES",
                            "FOOTWEAR",
                            "HOME",
                          ].map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="subcategory"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Subcategory
                        </label>
                        <input
                          type="text"
                          id="subcategory"
                          name="subcategory"
                          value={formData.subcategory}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="h-4 w-4 text-primary focus:ring-primary border-ui-border rounded"
                        />
                        <label
                          htmlFor="isActive"
                          className="ml-2 block text-sm text-text"
                        >
                          Product is active
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-text-muted mb-3">
                    Basic Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-text-muted">Product Name</p>
                      <p className="text-text font-medium">{product.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">Description</p>
                      <p className="text-text whitespace-pre-line">
                        {product.description || "No description available"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h4 className="text-md font-medium text-text-muted mb-3">
                    Pricing
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-text-muted">Selling Price</p>
                      <p className="text-text font-medium">
                        ₹{product.sellingPrice}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">MRP Price</p>
                      <p className="text-text">₹{product.mrpPrice}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">Discount</p>
                      <p className="text-green-600 font-medium">
                        {calculateDiscount()}% off
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">Stock</p>
                      <p className="text-text">
                        {product.stock !== undefined ? product.stock : "N/A"}{" "}
                        units
                      </p>
                    </div>
                  </div>
                </div>

                {/* Categories & Status */}
                <div>
                  <h4 className="text-md font-medium text-text-muted mb-3">
                    Categories & Status
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-text-muted">Category</p>
                      <p className="text-text">{product.category || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">Subcategory</p>
                      <p className="text-text">
                        {product.subcategory || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">Status</p>
                      <p
                        className={`${
                          product.isActive ? "text-green-600" : "text-red-600"
                        } font-medium`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seller Information */}
                <div>
                  <h4 className="text-md font-medium text-text-muted mb-3">
                    Seller Information
                  </h4>
                  <div className="space-y-3">
                    {product.seller ? (
                      <>
                        <div>
                          <p className="text-sm text-text-muted">Shop Name</p>
                          <Link
                            href={`/admin/superadmin/sellers/${product.seller.id}`}
                            className="text-primary hover:text-primary-dark font-medium"
                          >
                            {product.seller.shopName || "Unnamed Shop"}
                          </Link>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted">Owner Name</p>
                          <p className="text-text">
                            {product.seller.ownerName || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted">Contact</p>
                          <p className="text-text">
                            {product.seller.phone || "N/A"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-text-muted">
                        No seller information available
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-text-muted mb-3">
                    Timestamps
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-muted">Created At</p>
                      <p className="text-text">
                        {new Date(product.createdAt).toLocaleDateString()} (
                        {new Date(product.createdAt).toLocaleTimeString()})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">Last Updated</p>
                      <p className="text-text">
                        {new Date(product.updatedAt).toLocaleDateString()} (
                        {new Date(product.updatedAt).toLocaleTimeString()})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
