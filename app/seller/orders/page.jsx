"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual orders content
function OrdersContent() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock order data
  const mockOrders = [
    {
      id: "ORD-1001",
      customerName: "Priya Sharma",
      date: "2024-03-15",
      total: 1299,
      items: 2,
      status: "delivered",
      paymentMethod: "UPI",
      address: "123 Main St, Hyderabad",
    },
    {
      id: "ORD-1002",
      customerName: "Rahul Verma",
      date: "2024-03-14",
      total: 899,
      items: 1,
      status: "processing",
      paymentMethod: "Credit Card",
      address: "456 Park Ave, Hyderabad",
    },
    {
      id: "ORD-1003",
      customerName: "Ananya Patel",
      date: "2024-03-13",
      total: 2499,
      items: 3,
      status: "shipped",
      paymentMethod: "Cash on Delivery",
      address: "789 Oak Rd, Hyderabad",
    },
    {
      id: "ORD-1004",
      customerName: "Vikram Singh",
      date: "2024-03-12",
      total: 1599,
      items: 2,
      status: "delivered",
      paymentMethod: "UPI",
      address: "101 Pine St, Hyderabad",
    },
    {
      id: "ORD-1005",
      customerName: "Neha Gupta",
      date: "2024-03-11",
      total: 3299,
      items: 4,
      status: "cancelled",
      paymentMethod: "Credit Card",
      address: "202 Maple Ave, Hyderabad",
    },
  ];

  // Filter orders based on active tab and search term
  const filteredOrders = mockOrders.filter((order) => {
    const matchesTab = activeTab === "all" || order.status === activeTab;

    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "processing":
        return "bg-accent-light text-accent-dark";
      case "shipped":
        return "bg-info bg-opacity-10 text-info";
      case "delivered":
        return "bg-success bg-opacity-10 text-success";
      case "cancelled":
        return "bg-error bg-opacity-10 text-error";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
            activeTab === "processing"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("processing")}
        >
          Processing
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
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-background-alt">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {new Date(order.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      ₹{order.total.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      <button
                        className="text-primary hover:text-primary-dark mr-3"
                        onClick={() => {
                          // View order details (to be implemented)
                          alert(`View details for order ${order.id}`);
                        }}
                      >
                        View
                      </button>
                      {order.status === "processing" && (
                        <button
                          className="text-secondary hover:text-secondary-dark"
                          onClick={() => {
                            // Update order status (to be implemented)
                            alert(`Update status for order ${order.id}`);
                          }}
                        >
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-text-muted"
                  >
                    No orders found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal (placeholder for future implementation) */}
      {/* This will be implemented when backend integration is done */}
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
