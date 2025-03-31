"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual orders content
function OrdersContent() {
  const { user, getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        
        // Get the authentication token
        const token = await getAccessToken();
        
        if (!token) {
          // Handle missing token case
          console.error('No authentication token available');
          setError('Authentication required');
          setLoading(false);
          return;
        }
        
        const response = await fetch(`/api/seller/orders`, {
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
        
        setOrders(data.orders || []);
        
        // Safely access stats
        if (data.stats && typeof data.stats === 'object') {
          setStats(data.stats);
        } else {
          // Default stats if not available
          setStats({
            totalOrders: 0,
            pendingOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0
          });
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err.message);
        // Reset to default values on error
        setOrders([]);
        setStats({
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchOrders();
    } else {
      // Handle case when user is not authenticated
      setLoading(false);
    }
  }, [user?.id, getAccessToken]);

  // Filter orders based on active tab and search term
  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "all" || order.status.toLowerCase() === activeTab;

    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
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

      {/* Orders Table */}
      <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 text-center">
            <p className="text-text-muted">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-error">Error: {error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-text-muted">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ui-border">
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
              <tbody className="bg-background-card divide-y divide-ui-border">
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
        )}
      </div>
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
