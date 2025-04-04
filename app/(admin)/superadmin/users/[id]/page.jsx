"use client";

import React, { Suspense } from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function OrganizationUsersContent() {
  const { id } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    isBlocked: false,
  });
  const [blockLoading, setBlockLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userResponse = await axios.get(
          `${API_BASE_URL}/admin/users/${id}`
        );
        setUser(userResponse.data.user);
        setFormData({
          name: userResponse.data.user.name || "",
          email: userResponse.data.user.email || "",
          phone: userResponse.data.user.phone || "",
          isBlocked: userResponse.data.user.isBlocked || false,
        });

        // Also fetch user's orders
        const ordersResponse = await axios.get(
          `${API_BASE_URL}/admin/users/${id}/orders`
        );
        setOrders(ordersResponse.data.orders || []);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError(error.response?.data?.message || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserData();
    }
  }, [id]);

  // Handle form change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/users/${id}`,
        formData
      );
      setUser(response.data.user);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user:", error);
      setError(error.response?.data?.message || "Failed to update user data");
    }
  };

  // Toggle user block status
  const toggleBlockStatus = async () => {
    try {
      setBlockLoading(true);
      const newBlockedStatus = !user.isBlocked;
      const response = await axios.patch(
        `${API_BASE_URL}/admin/users/${id}`,
        {
          isBlocked: newBlockedStatus,
        }
      );
      setUser(response.data.user);
      setFormData({
        ...formData,
        isBlocked: response.data.user.isBlocked,
      });
    } catch (error) {
      console.error("Error toggling block status:", error);
      setError(error.response?.data?.message || "Failed to update user status");
    } finally {
      setBlockLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    try {
      setDeleteLoading(true);
      await axios.delete(`${API_BASE_URL}/admin/users/${id}`);
      router.push("/admin/superadmin/users");
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error.response?.data?.message || "Failed to delete user");
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <button
          onClick={() => router.push("/admin/superadmin/users")}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
        >
          Back to Users
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <p className="font-bold">User Not Found</p>
        <p>The requested user could not be found or has been deleted.</p>
        <button
          onClick={() => router.push("/admin/superadmin/users")}
          className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded"
        >
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text">User Details</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push("/admin/superadmin/users")}
            className="bg-background hover:bg-background-alt text-text border border-ui-border px-4 py-2 rounded-md"
          >
            Back to Users
          </button>
          <button
            onClick={toggleBlockStatus}
            className={`px-4 py-2 rounded-md ${
              user.isBlocked
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            disabled={blockLoading}
          >
            {blockLoading
              ? "Updating..."
              : user.isBlocked
              ? "Unblock User"
              : "Block User"}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-ui-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2 px-4 font-medium ${
              activeTab === "profile"
                ? "border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`py-2 px-4 font-medium ${
              activeTab === "orders"
                ? "border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-background-card rounded-lg shadow p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-text-muted mb-1"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-text-muted mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-text-muted mb-1"
                  >
                    Phone
                  </label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center h-full mt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isBlocked"
                      checked={formData.isBlocked}
                      onChange={handleChange}
                      className="form-checkbox h-5 w-5 text-primary rounded border-ui-border focus:ring-primary"
                    />
                    <span className="ml-2 text-text">Block User</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user.name || "",
                      email: user.email || "",
                      phone: user.phone || "",
                      isBlocked: user.isBlocked || false,
                    });
                  }}
                  className="px-4 py-2 border border-ui-border rounded-md text-text hover:bg-background-alt"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-20 w-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user.name
                      ? user.name.charAt(0).toUpperCase()
                      : user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-6">
                    <h2 className="text-xl font-semibold text-text">
                      {user.name || "No Name"}
                    </h2>
                    <p className="text-text-muted">{user.email}</p>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.isBlocked
                            ? "bg-red-100 text-red-800"
                            : user.isEmailVerified
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {user.isBlocked
                          ? "Blocked"
                          : user.isEmailVerified
                          ? "Verified"
                          : "Unverified"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-background hover:bg-background-alt text-text border border-ui-border rounded-md"
                >
                  Edit Profile
                </button>
              </div>

              <div className="border-t border-ui-border pt-6">
                <h3 className="text-lg font-medium text-text mb-4">
                  User Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-sm text-text-muted">Name</p>
                    <p className="text-text">{user.name || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Email</p>
                    <p className="text-text">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Phone</p>
                    <p className="text-text">{user.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Email Verified</p>
                    <p className="text-text">
                      {user.isEmailVerified ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">User ID</p>
                    <p className="text-text">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Created At</p>
                    <p className="text-text">{formatDate(user.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Last Updated</p>
                    <p className="text-text">{formatDate(user.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="bg-background-card rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-ui-border">
            <h3 className="text-lg font-medium text-text">
              Order History{" "}
              <span className="text-text-muted text-sm">
                ({orders.length} orders)
              </span>
            </h3>
          </div>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ui-border">
                <thead className="bg-background-alt">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background-card divide-y divide-ui-border">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-background-alt">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {order.orderNumber || order.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === "DELIVERED"
                              ? "bg-green-100 text-green-800"
                              : order.status === "SHIPPED"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "PROCESSING"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "CANCELLED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/superadmin/orders/${order.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View Order
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-text-muted">
              This user has not placed any orders yet.
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-medium text-text mb-4">
              Confirm User Deletion
            </h3>
            <p className="text-text-muted mb-6">
              Are you sure you want to delete this user? This will permanently
              remove their account, including all order history. This action
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-ui-border rounded-md text-text hover:bg-background-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizationUsersPage() {
  return (
    <Suspense fallback={<div>Loading organization users...</div>}>
      <OrganizationUsersContent />
    </Suspense>
  );
}
