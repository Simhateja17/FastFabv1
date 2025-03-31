"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual earnings content
function EarningsContent() {
  const { user, getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState("30days");
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCommission: 0,
    totalRefunds: 0,
    netEarnings: 0,
    availableBalance: 0,
    totalPayouts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEarnings = async () => {
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
        
        const response = await fetch(`/api/seller/earnings?dateRange=${dateRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch earnings: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format');
        }
        
        setEarnings(data.earnings || []);
        
        // Safely access stats with fallback
        if (data.stats && typeof data.stats === 'object' && data.stats[dateRange]) {
          setStats(data.stats[dateRange]);
        } else {
          // Default stats if not available
          setStats({
            totalSales: 0,
            totalCommission: 0,
            totalRefunds: 0,
            netEarnings: 0,
            availableBalance: 0,
            totalPayouts: 0
          });
        }
      } catch (err) {
        console.error('Error fetching earnings:', err);
        setError(err.message);
        // Reset to default values on error
        setEarnings([]);
        setStats({
          totalSales: 0,
          totalCommission: 0,
          totalRefunds: 0,
          netEarnings: 0,
          availableBalance: 0,
          totalPayouts: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchEarnings();
    } else {
      // Handle case when user is not authenticated
      setLoading(false);
    }
  }, [user?.id, dateRange, getAccessToken]);

  // Update stats when date range changes
  useEffect(() => {
    // Avoid duplicate API calls - the first useEffect will already handle this
    // Only manually update stats from API if we have a user and the component is already mounted
    if (stats && dateRange && user?.id && !loading) {
      const fetchStats = async () => {
        try {
          // Get the authentication token
          const token = await getAccessToken();
          
          if (!token) {
            console.error('No authentication token available for stats update');
            return;
          }
          
          const response = await fetch(`/api/seller/earnings?dateRange=${dateRange}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            console.error(`Failed to update stats: ${response.status} ${response.statusText}`);
            return;
          }
          
          const data = await response.json();
          
          // Safely access stats
          if (data.stats && typeof data.stats === 'object' && data.stats[dateRange]) {
            setStats(data.stats[dateRange]);
          }
        } catch (err) {
          console.error('Error updating stats:', err);
          // Don't reset stats on error for this secondary update
        }
      };
      
      fetchStats();
    }
  }, [dateRange, user?.id, getAccessToken, loading]);

  // Filter transactions based on active tab
  const filteredTransactions = earnings.filter((transaction) => {
    if (activeTab === "all") return true;
    return transaction.type.toLowerCase() === activeTab.toLowerCase();
  });

  // Get transaction type badge color
  const getTypeBadgeClass = (type) => {
    switch (type.toLowerCase()) {
      case "sale":
        return "bg-success bg-opacity-10 text-success";
      case "refund":
        return "bg-error bg-opacity-10 text-error";
      case "payout":
        return "bg-accent-light text-accent-dark";
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
          Earnings Dashboard
        </h1>

        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              dateRange === "7days"
                ? "bg-primary text-white border-primary"
                : "bg-white text-text border-ui-border hover:bg-background-alt"
            }`}
            onClick={() => setDateRange("7days")}
          >
            7 Days
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b ${
              dateRange === "30days"
                ? "bg-primary text-white border-primary"
                : "bg-white text-text border-ui-border hover:bg-background-alt"
            }`}
            onClick={() => setDateRange("30days")}
          >
            30 Days
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
              dateRange === "90days"
                ? "bg-primary text-white border-primary"
                : "bg-white text-text border-ui-border hover:bg-background-alt"
            }`}
            onClick={() => setDateRange("90days")}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((item) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Total Sales</p>
                <h3 className="text-2xl font-semibold text-text-dark mt-1">
                  {formatCurrency(stats.totalSales || 0)}
                </h3>
              </div>
              <div className="p-3 bg-success bg-opacity-10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Platform Fees</p>
                <h3 className="text-2xl font-semibold text-text-dark mt-1">
                  {formatCurrency(stats.totalCommission || 0)}
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
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Net Earnings</p>
                <h3 className="text-2xl font-semibold text-text-dark mt-1">
                  {formatCurrency(stats.netEarnings || 0)}
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Available Balance</p>
                <h3 className="text-2xl font-semibold text-text-dark mt-1">
                  {formatCurrency(stats.availableBalance || 0)}
                </h3>
              </div>
              <div className="p-3 bg-info bg-opacity-10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-info"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
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
          All Transactions
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "sale"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("sale")}
        >
          Sales
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "refund"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("refund")}
        >
          Refunds
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "payout"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("payout")}
        >
          Payouts
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 text-center">
            <p className="text-text-muted">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-error">Error: {error}</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-text-muted">No transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ui-border">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Related Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Net Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-card divide-y divide-ui-border">
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-background-alt"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {transaction.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {transaction.orderId || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getTypeBadgeClass(
                          transaction.type
                        )}`}
                      >
                        {transaction.type.charAt(0) +
                          transaction.type.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatCurrency(transaction.commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {formatCurrency(transaction.netAmount)}
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

// Wrap the earnings content with the ProtectedRoute component
export default function SellerEarnings() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <EarningsContent />
    </ProtectedRoute>
  );
}
