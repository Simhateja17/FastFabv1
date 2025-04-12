"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import getAdminApiClient from "@/app/utils/apiClient";

export default function SellerDetailPage({ params }) {
  const sellerId = params.id;
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const router = useRouter();

  // Fetch seller data
  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        // Get API client with admin authorization
        const apiClient = getAdminApiClient();
        
        const response = await apiClient.get(
          `/api/admin/sellers/${sellerId}`
        );
        setSeller(response.data);
        setProducts(response.data.products || []);
        setFormData({
          phone: response.data.phone || "",
          shopName: response.data.shopName || "",
          ownerName: response.data.ownerName || "",
          address: response.data.address || "",
          city: response.data.city || "",
          state: response.data.state || "",
          pincode: response.data.pincode || "",
          openTime: response.data.openTime || "",
          closeTime: response.data.closeTime || "",
          categories: response.data.categories || [],
        });
      } catch (error) {
        console.error("Error fetching seller data:", error);
        setError(
          error.response?.data?.message || "Failed to load seller details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerId]);

  // Handle form data change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle categories change
  const handleCategoryChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({
        ...formData,
        categories: [...formData.categories, value],
      });
    } else {
      setFormData({
        ...formData,
        categories: formData.categories.filter(
          (category) => category !== value
        ),
      });
    }
  };

  // Save seller data
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const apiClient = getAdminApiClient();
      const response = await apiClient.put(
        `/api/admin/sellers/${sellerId}`,
        formData
      );
      setSeller(response.data.seller);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating seller:", error);
      setSaveError(
        error.response?.data?.message || "Failed to update seller details"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // View product details
  const viewProductDetails = (productId) => {
    router.push(`/superadmin/products/${productId}`);
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      phone: seller.phone || "",
      shopName: seller.shopName || "",
      ownerName: seller.ownerName || "",
      address: seller.address || "",
      city: seller.city || "",
      state: seller.state || "",
      pincode: seller.pincode || "",
      openTime: seller.openTime || "",
      closeTime: seller.closeTime || "",
      categories: seller.categories || [],
    });
    setIsEditing(false);
    setSaveError(null);
  };

  // Handle delete product
  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const apiClient = getAdminApiClient();
      await apiClient.delete(`/api/admin/products/${productId}`);
      setProducts(products.filter((product) => product.id !== productId));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert(error.response?.data?.message || "Failed to delete product");
    }
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
          href="/admin/superadmin/sellers"
          className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Back to Sellers
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            href="/admin/superadmin/sellers"
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
            Back to Sellers
          </Link>
          <h1 className="text-2xl font-bold text-text">
            {seller.shopName || "Unnamed Shop"}
          </h1>
          <p className="text-text-muted">ID: {seller.id}</p>
        </div>
        <div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              Edit Seller
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

      {/* Tabs */}
      <div className="mb-6 border-b border-ui-border">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === "profile"
                  ? "border-primary text-primary"
                  : "border-transparent hover:text-primary-dark hover:border-primary-dark"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === "products"
                  ? "border-primary text-primary"
                  : "border-transparent hover:text-primary-dark hover:border-primary-dark"
              }`}
              onClick={() => setActiveTab("products")}
            >
              Products ({products.length})
            </button>
          </li>
        </ul>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-background-card rounded-lg shadow p-6">
          {isEditing ? (
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-text mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-text-muted mb-1"
                      >
                        Phone Number
                      </label>
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="shopName"
                        className="block text-sm font-medium text-text-muted mb-1"
                      >
                        Shop Name
                      </label>
                      <input
                        type="text"
                        id="shopName"
                        name="shopName"
                        value={formData.shopName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ownerName"
                        className="block text-sm font-medium text-text-muted mb-1"
                      >
                        Owner Name
                      </label>
                      <input
                        type="text"
                        id="ownerName"
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-medium text-text mb-4">
                    Location
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="address"
                        className="block text-sm font-medium text-text-muted mb-1"
                      >
                        Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="city"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="state"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          State
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="pincode"
                        className="block text-sm font-medium text-text-muted mb-1"
                      >
                        PIN Code
                      </label>
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div>
                  <h3 className="text-lg font-medium text-text mb-4">
                    Business Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="openTime"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Opening Time
                        </label>
                        <input
                          type="text"
                          id="openTime"
                          name="openTime"
                          value={formData.openTime}
                          onChange={handleChange}
                          placeholder="e.g. 09:00 AM"
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="closeTime"
                          className="block text-sm font-medium text-text-muted mb-1"
                        >
                          Closing Time
                        </label>
                        <input
                          type="text"
                          id="closeTime"
                          name="closeTime"
                          value={formData.closeTime}
                          onChange={handleChange}
                          placeholder="e.g. 08:00 PM"
                          className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-lg font-medium text-text mb-4">
                    Categories
                  </h3>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {[
                        "MEN",
                        "WOMEN",
                        "KIDS",
                        "ACCESSORIES",
                        "FOOTWEAR",
                        "HOME",
                      ].map((category) => (
                        <label
                          key={category}
                          className="inline-flex items-center p-2 border border-ui-border rounded-md cursor-pointer hover:bg-background-alt"
                        >
                          <input
                            type="checkbox"
                            name="categories"
                            value={category}
                            checked={formData.categories.includes(category)}
                            onChange={handleCategoryChange}
                            className="h-4 w-4 text-primary focus:ring-primary border-ui-border rounded"
                          />
                          <span className="ml-2 text-sm text-text">
                            {category}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-text mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-text-muted">Phone Number</p>
                    <p className="text-text">{seller.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Shop Name</p>
                    <p className="text-text">{seller.shopName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Owner Name</p>
                    <p className="text-text">{seller.ownerName || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-medium text-text mb-4">Location</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-text-muted">Address</p>
                    <p className="text-text">{seller.address || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">City, State</p>
                    <p className="text-text">
                      {seller.city ? seller.city : "N/A"}
                      {seller.city && seller.state ? ", " : ""}
                      {seller.state || ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">PIN Code</p>
                    <p className="text-text">{seller.pincode || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div>
                <h3 className="text-lg font-medium text-text mb-4">
                  Business Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-text-muted">Store Hours</p>
                    <p className="text-text">
                      {seller.openTime ? `${seller.openTime} - ` : ""}
                      {seller.closeTime || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Account Created</p>
                    <p className="text-text">
                      {new Date(seller.createdAt).toLocaleDateString()} (
                      {new Date(seller.createdAt).toLocaleTimeString()})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Last Updated</p>
                    <p className="text-text">
                      {new Date(seller.updatedAt).toLocaleDateString()} (
                      {new Date(seller.updatedAt).toLocaleTimeString()})
                    </p>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-lg font-medium text-text mb-4">
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {seller.categories && seller.categories.length > 0 ? (
                    seller.categories.map((category) => (
                      <span
                        key={category}
                        className="px-2 py-1 bg-background-alt text-text-muted rounded-md text-sm"
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <span className="text-text-muted">No categories</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="bg-background-card rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-ui-border flex justify-between items-center">
            <h3 className="text-lg font-medium text-text">Seller Products</h3>
          </div>
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
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-card divide-y divide-ui-border">
                {products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-background-alt">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-background-alt rounded-md overflow-hidden relative">
                            {product.images && product.images.length > 0 ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name || 'Product image'}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src =
                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40' fill='%23eee'%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23aaa'%3ENoImg%3C/text%3E%3C/svg%3E";
                                }}
                                sizes="40px"
                              />
                            ) : (
                              <div className="h-10 w-10 flex items-center justify-center text-text-muted">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-text">
                              {product.name}
                            </div>
                            <div className="text-sm text-text-muted truncate max-w-xs">
                              {product.description || "No description"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text">
                          ₹{product.sellingPrice}
                        </div>
                        {product.mrpPrice > product.sellingPrice && (
                          <div className="text-sm text-text-muted line-through">
                            ₹{product.mrpPrice}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-text">
                          {product.category || "N/A"}
                          {product.subcategory
                            ? ` / ${product.subcategory}`
                            : ""}
                        </span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => viewProductDetails(product.id)}
                          className="text-primary hover:text-primary-dark mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
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
                      colSpan="5"
                      className="px-6 py-4 text-center text-sm text-text-muted"
                    >
                      No products found for this seller
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
