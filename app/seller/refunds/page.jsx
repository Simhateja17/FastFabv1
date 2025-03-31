"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual refunds content
function RefundsContent() {
  const { user, getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refunds, setRefunds] = useState([]);
  const [stats, setStats] = useState({
    totalRefundsAmount: 0,
    pendingRefundsCount: 0,
    refundRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRefunds = async () => {
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
        
        const response = await fetch(`/api/seller/refunds`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch refunds: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format');
        }
        
        setRefunds(data.refunds || []);
        
        // Safely access stats
        if (data.stats && typeof data.stats === 'object') {
          setStats(data.stats);
        } else {
          // Default stats if not available
          setStats({
            totalRefundsAmount: 0,
            pendingRefundsCount: 0,
            refundRate: 0
          });
        }
      } catch (err) {
        console.error('Error fetching refunds:', err);
        setError(err.message);
        // Reset to default values on error
        setRefunds([]);
        setStats({
          totalRefundsAmount: 0,
          pendingRefundsCount: 0,
          refundRate: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchRefunds();
    } else {
      // Handle case when user is not authenticated
      setLoading(false);
    }
  }, [user?.id, getAccessToken]);

  // Filter refunds based on active tab and search term
  const filteredRefunds = refunds.filter((refund) => {
    const matchesTab = activeTab === "all" || refund.status.toLowerCase() === activeTab.toLowerCase();

    const matchesSearch =
      refund.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.orderId?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-accent-light text-accent-dark";
      case "approved":
        return "bg-success bg-opacity-10 text-success";
      case "rejected":
        return "bg-error bg-opacity-10 text-error";
      case "processed":
        return "bg-info bg-opacity-10 text-info";
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
          Refund Management
        </h1>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search refunds..."
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

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-background-alt rounded w-3/4"></div>
                  <div className="h-6 bg-background-alt rounded w-1/2"></div>
                </div>
                <div className="rounded-full bg-background-alt h-12 w-12"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Total Refunds</p>
                <h3 className="text-2xl font-semibold text-text-dark mt-1">
                  {formatCurrency(stats.totalRefundsAmount)}
                </h3>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-text-muted">Last 30 days</span>
            </div>
          </div>

          <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Pending Refunds</p>
                <h3 className="text-2xl font-semibold text-text-dark mt-1">
                  {stats.pendingRefundsCount}
                </h3>
              </div>
              <div className="p-3 bg-accent bg-opacity-10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-accent-dark"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-accent-dark">
                {stats.pendingRefundsCount > 0 ? "Requires action" : "No action needed"}
              </span>
            </div>
          </div>

          <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Refund Rate</p>
                <h3 className="text-2xl font-semibold text-text-dark mt-1">
                  {stats.refundRate}%
                </h3>
              </div>
              <div className="p-3 bg-secondary bg-opacity-10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-success">
                {parseFloat(stats.refundRate) < 5 ? "Below industry average" : "Review needed"}
              </span>
            </div>
          </div>
        </div>
      )}

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
          All Refunds
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
            activeTab === "approved"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("approved")}
        >
          Approved
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "rejected"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("rejected")}
        >
          Rejected
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "processed"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("processed")}
        >
          Processed
        </button>
      </div>

      {/* Refunds Table */}
      <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 text-center">
            <p className="text-text-muted">Loading refunds...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-error">Error: {error}</p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-text-muted">No refunds found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ui-border">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Refund ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Reason
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
                {filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-background-alt">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {refund.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {refund.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatDate(refund.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatCurrency(refund.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text max-w-xs truncate">
                      {refund.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(
                          refund.status
                        )}`}
                      >
                        {refund.status.charAt(0) +
                          refund.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      <button
                        className="text-primary hover:text-primary-dark mr-3"
                        onClick={() => {
                          // View refund details (to be implemented)
                          alert(`View details for refund ${refund.id}`);
                        }}
                      >
                        View
                      </button>
                      {refund.status === "PENDING" && (
                        <>
                          <button
                            className="text-success hover:text-success-dark mr-3"
                            onClick={() => {
                              // Approve refund (to be implemented)
                              alert(`Approve refund ${refund.id}`);
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="text-error hover:text-error-dark"
                            onClick={() => {
                              // Reject refund (to be implemented)
                              alert(`Reject refund ${refund.id}`);
                            }}
                          >
                            Reject
                          </button>
                        </>
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

// Wrap the refunds content with the ProtectedRoute component
export default function SellerRefunds() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <RefundsContent />
    </ProtectedRoute>
  );
}
