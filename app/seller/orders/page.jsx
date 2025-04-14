"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual orders content
function OrdersContent() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    confirmedOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  
  const { getAccessToken, user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    // Reset pagination when tab changes
    setPage(1);
    setOrders([]);
    fetchOrders(1);
  }, [user?.id, activeTab, authLoading]);

  const fetchOrders = async (pageToFetch = page) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAccessToken();
      
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      // Calculate offset based on page
      const offset = (pageToFetch - 1) * limit;
      
      // Construct API URL with query parameters
      const status = activeTab !== "all" ? activeTab : "";
      const url = new URL("/api/seller/orders", window.location.origin);
      if (status) url.searchParams.append("status", status);
      url.searchParams.append("limit", limit.toString());
      url.searchParams.append("offset", offset.toString());
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      
      const newOrders = data.orders || [];
      
      // If first page, replace orders; otherwise append
      if (pageToFetch === 1) {
        setOrders(newOrders);
      } else {
        setOrders(prevOrders => [...prevOrders, ...newOrders]);
      }
      
      // Determine if there's more data to load
      setHasMore(newOrders.length === limit);
      
      // Update page
      setPage(pageToFetch);
      
      // Safely access stats
      if (data.stats && typeof data.stats === 'object') {
        setStats(data.stats);
      } else {
        // Default stats if not available
        setStats({
          totalOrders: 0,
          pendingOrders: 0,
          processingOrders: 0,
          confirmedOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0
        });
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
      // Don't reset orders on error, especially on pagination
      if (page === 1) {
        setOrders([]);
        setStats({
          totalOrders: 0,
          pendingOrders: 0,
          processingOrders: 0,
          confirmedOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load more orders
  const loadMoreOrders = () => {
    if (!loading && hasMore) {
      fetchOrders(page + 1);
    }
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case "processing":
      case "pending":
      case "confirmed":
        return "bg-accent-light text-accent-dark";
      case "shipped":
        return "bg-info bg-opacity-10 text-info";
      case "delivered":
        return "bg-success bg-opacity-10 text-success";
      case "cancelled":
      case "returned":
        return "bg-error bg-opacity-10 text-error";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-primary">
          Order Management
        </h1>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search orders..."
            className="w-full px-4 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
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

      {/* Order Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-ui-border">
          <p className="text-text-muted text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-primary">{stats.totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-ui-border">
          <p className="text-text-muted text-sm">Pending</p>
          <p className="text-2xl font-bold text-accent">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-ui-border">
          <p className="text-text-muted text-sm">Delivered</p>
          <p className="text-2xl font-bold text-success">{stats.deliveredOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-ui-border">
          <p className="text-text-muted text-sm">Cancelled</p>
          <p className="text-2xl font-bold text-error">{stats.cancelledOrders}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto mb-6 border-b border-ui-border">
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All Orders
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "pending"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "confirmed"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("confirmed")}
        >
          Confirmed
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "shipped"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("shipped")}
        >
          Shipped
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "delivered"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("delivered")}
        >
          Delivered
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "cancelled"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("cancelled")}
        >
          Cancelled
        </button>
      </div>

      {/* Loading state */}
      {loading && page === 1 && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-error bg-opacity-10 text-error p-4 rounded-md my-6">
          <p className="font-medium">Error fetching orders:</p>
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-error text-white rounded-md hover:bg-error-dark"
            onClick={() => fetchOrders(1)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredOrders.length === 0 && (
        <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-ui-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-text-muted mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No orders found</h3>
          <p className="text-text-muted max-w-sm mx-auto">
            {searchTerm 
              ? `No orders match your search for "${searchTerm}"`
              : activeTab !== "all" 
                ? `You don't have any ${activeTab} orders yet`
                : "You haven't received any orders yet. When you do, they'll appear here."}
          </p>
        </div>
      )}

      {/* Orders list (Keep most of the existing implementation but add pagination) */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-ui-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-background-alt">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {order.user?.name || 'Unknown Customer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      <button
                        className="text-primary hover:text-primary-dark mr-3"
                        onClick={() => {
                          // View order details (to be implemented)
                          alert(`View details for order ${order.orderNumber}`);
                        }}
                      >
                        View
                      </button>
                      {(order.status === "PENDING" || order.status === "CONFIRMED") && (
                        <button
                          className="text-secondary hover:text-secondary-dark"
                          onClick={() => {
                            // Update order status (to be implemented)
                            alert(`Update status for order ${order.orderNumber}`);
                          }}
                        >
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Load more button */}
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={loadMoreOrders}
                disabled={loading}
                className={`px-4 py-2 rounded-md font-medium ${
                  loading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary-dark"
                }`}
              >
                {loading && page > 1 ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Load More Orders"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Wrap the orders content with the ProtectedRoute component
export default function SellerOrders() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <OrdersContent />
    </ProtectedRoute>
  );
}
