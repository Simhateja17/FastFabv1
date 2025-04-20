"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { USER_ENDPOINTS } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import {
  FiPackage,
  FiChevronRight,
  FiCalendar,
  FiDollarSign,
  FiSearch,
} from "react-icons/fi";

export default function Orders() {
  const router = useRouter();
  const { user, userAuthFetch, loading: authLoading } = useUserAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ordersPerPage = 5;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userAuthFetch(USER_ENDPOINTS.ORDERS);
      if (response.ok) {
        const data = await response.json();
        // Handle different API response formats
        const ordersList = Array.isArray(data)
          ? data
          : data.orders || data.data?.orders || data.data || [];

        setOrders(ordersList);
        console.log("Orders fetched successfully:", ordersList);
      } else {
        console.error(
          `Error fetching orders: ${response.status} ${response.statusText}`
        );
        toast.error("Failed to fetch orders. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (
        error.message.includes("No refresh token available") ||
        error.message.includes("Failed to refresh token")
      ) {
        // This is an auth issue - only show sign in message if user was actually signed out
        if (
          !localStorage.getItem("userData") &&
          !localStorage.getItem("userAccessToken")
        ) {
          toast.error("Please sign in to view your orders");
          router.push("/login");
        }
      } else {
        toast.error("Failed to fetch orders. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [userAuthFetch, router]);

  // Fetch orders on component mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return; // Skip if auth context is still loading

      console.log("Orders page - Checking auth:", !!user);

      try {
        // If no user in context, check localStorage as fallback
        if (!user) {
          const savedUserData = localStorage.getItem("userData");
          const accessToken = localStorage.getItem("userAccessToken");
          const refreshToken = localStorage.getItem("userRefreshToken");

          console.log("Orders page - Auth fallbacks:", {
            savedUserData: !!savedUserData,
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
          });

          // If we have no authentication data at all, redirect to login
          if (!savedUserData && !accessToken && !refreshToken) {
            toast.error("Please sign in to view your orders");
            router.push("/login");
            return;
          }
        }

        // Proceed with fetching orders - userAuthFetch will handle token refresh if needed
        await fetchOrders();
      } catch (error) {
        console.error("Authentication check error:", error);
        toast.error("Authentication error. Please sign in again.");
        router.push("/login");
      }
    };

    checkAuth();
  }, [user, authLoading, router, fetchOrders]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchOrders();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "shipped":
        return "text-purple-600 bg-purple-100";
      case "delivered":
        return "text-green-600 bg-green-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      case "refunded":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Orders</h1>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search by order ID or product name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-72 pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <button
              type="submit"
              className="ml-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              Search
            </button>
          </form>

          {/* Status filter */}
          <div className="flex items-center">
            <label htmlFor="status-filter" className="mr-2 text-gray-600">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1); // Reset to first page on filter change
              }}
              className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <FiPackage className="text-5xl text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              No orders found
            </h2>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters or search query."
                : "You haven't placed any orders yet."}
            </p>
            <Link
              href="/products"
              className="bg-secondary text-white px-6 py-3 rounded-md hover:bg-secondary-dark transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium">
                          {order.orderId || order.id}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiCalendar className="text-gray-400 mr-2" />
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <span className="font-medium">
                            {order.items?.length || 0} item(s)
                          </span>
                          {order.items?.[0] && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {order.items[0].product?.name}
                              {order.items.length > 1 &&
                                ` + ${order.items.length - 1} more`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiDollarSign className="text-gray-400 mr-1" />
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status || "Processing"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-900"
                        >
                          View Details
                          <FiChevronRight className="ml-1" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className={`px-4 py-2 border rounded-md ${
                    currentPage === 1
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Previous
                </button>

                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 border rounded-md ${
                    currentPage === totalPages
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
