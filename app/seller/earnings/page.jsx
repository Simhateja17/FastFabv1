"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import WithdrawModal from "@/components/modals/WithdrawModal";

// The actual earnings content
function EarningsContent() {
  const { seller, getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState("30days");
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    platformFees: 0,
    totalRefunds: 0,
    netEarnings: 0,
    availableBalance: 0,
    totalPayouts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Remove the log for 'user', use 'seller'
  console.log("[EarningsContent] Seller from useAuth():", JSON.stringify(seller));

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        
        // Get the authentication token
        console.log("[EarningsContent] Attempting to get access token..."); // Log token fetch attempt
        const token = await getAccessToken();
        console.log("[EarningsContent] Access token received:", token ? `Token found (length: ${token.length})` : "No token found"); // Log token result
        
        if (!token) {
          console.error('[EarningsContent] No authentication token available after getAccessToken()'); // Log if token is missing
          setError('Authentication required. Token missing.'); // More specific error
          setLoading(false);
          return;
        }
        
        // Construct the backend URL using environment variable or default
        const backendUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000/api';

        // Fetch both earnings transactions and stats in parallel
        const [earningsResponse, statsResponse] = await Promise.all([
             fetch(`${backendUrl}/seller/earnings?period=${dateRange}`, { // Use 'period' query param
                 headers: { 'Authorization': `Bearer ${token}` }
             }),
             fetch(`${backendUrl}/seller/earnings/stats?period=${dateRange}`, { // Use 'period' query param
                 headers: { 'Authorization': `Bearer ${token}` }
             })
         ]);

        if (!earningsResponse.ok) {
          throw new Error(`Failed to fetch earnings transactions: ${earningsResponse.status} ${earningsResponse.statusText}`);
        }
         if (!statsResponse.ok) {
          throw new Error(`Failed to fetch earnings stats: ${statsResponse.status} ${statsResponse.statusText}`);
        }

        const earningsData = await earningsResponse.json();
        const statsData = await statsResponse.json();

        if (!earningsData || typeof earningsData !== 'object' || !statsData || typeof statsData !== 'object') {
            throw new Error('Invalid response format from API');
        }

        setEarnings(earningsData.transactions || []); // Assuming transactions are under 'transactions' key

        // Safely access stats with fallback
        if (statsData.stats && typeof statsData.stats === 'object') {
          setStats({
              totalSales: statsData.stats.totalSales || 0,
              platformFees: statsData.stats.totalCommission || 0, // Map commission to platformFees
              totalRefunds: statsData.stats.totalRefunds || 0,
              netEarnings: statsData.stats.netEarnings || 0,
              availableBalance: statsData.stats.availableBalance || 0,
              totalPayouts: statsData.stats.totalPayouts || 0
          });
        } else {
          // Default stats if not available
          setStats({
            totalSales: 0,
            platformFees: 0,
            totalRefunds: 0,
            netEarnings: 0,
            availableBalance: 0,
            totalPayouts: 0
          });
        }
      } catch (err) {
        console.error('Error fetching earnings data:', err);
        setError(err.message);
        // Reset to default values on error
        setEarnings([]);
        setStats({
          totalSales: 0,
          platformFees: 0,
          totalRefunds: 0,
          netEarnings: 0,
          availableBalance: 0,
          totalPayouts: 0
        });
      } finally {
        setLoading(false);
      }
    };

    // Log seller object state *before* the check
    console.log("[EarningsContent useEffect] Checking seller object:", JSON.stringify(seller));
    console.log("[EarningsContent useEffect] Checking seller ID:", seller?.id);

    // Use seller.id for the check
    if (seller?.id) { 
      console.log(`[EarningsContent useEffect] Seller ID found (${seller.id}), fetching earnings...`);
      fetchEarnings();
    } else {
      console.error("[EarningsContent useEffect] Seller object or seller ID is missing.", JSON.stringify(seller));
      setError("Seller not authenticated or seller ID is missing."); // Updated error message slightly
      setLoading(false);
    }
    // Use seller.id in dependencies
  }, [seller?.id, dateRange, getAccessToken]);

  // Filter transactions based on active tab
  const filteredTransactions = earnings.filter((transaction) => {
    if (activeTab === "all") return true;
    // Ensure comparison is robust (case-insensitive and handles potential null/undefined type)
    return transaction?.type?.toLowerCase() === activeTab.toLowerCase();
  });

  // Get transaction type badge color
  const getTypeBadgeClass = (type) => {
    if (!type) return "bg-gray-100 text-gray-800"; // Handle null/undefined types
    switch (type.toLowerCase()) {
      case "sale":
        return "bg-green-100 text-green-800"; // Use clearer color names
      case "refund":
        return "bg-red-100 text-red-800";
      case "payout":
        return "bg-blue-100 text-blue-800";
      case "platform_fee": // Add case for platform fees if they appear as transactions
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    // Handle potential non-numeric input gracefully
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      // Return a placeholder or default value for invalid amounts
      return "₹--";
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      // Use minimumFractionDigits to ensure cents are shown if needed, or 0 if typically whole numbers
      minimumFractionDigits: 0, // Changed from maximumFractionDigits for consistency
      maximumFractionDigits: 2  // Allow up to 2 decimal places if present
    }).format(numericAmount);
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      // More robust date parsing
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
          // Handle invalid date string
          return "Invalid Date";
      }
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Invalid Date"; // Return fallback on error
    }
  };

  // Handle opening the withdraw modal
  const handleOpenWithdrawModal = () => {
    if (stats.availableBalance > 0) {
      setIsWithdrawModalOpen(true);
    } else {
      // Optionally, show a message that withdrawal isn't possible
      alert("Available balance is zero. Cannot initiate withdrawal.");
      // Or use a more sophisticated notification system
    }
  };

  const handleCloseWithdrawModal = () => {
    setIsWithdrawModalOpen(false);
  };

  const handleWithdrawSuccess = (newBalance) => {
    // Update the stats with the new balance
    setStats(prevStats => ({
      ...prevStats,
      availableBalance: newBalance
    }));
    setIsWithdrawModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Total Sales Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.totalSales)}
              </p>
            </div>

            {/* Platform Fees Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Platform Fees</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.platformFees)}
              </p>
            </div>

            {/* Net Earnings Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Net Earnings</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.netEarnings)}
              </p>
            </div>

            {/* Available Balance Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Available Balance</h3>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {formatCurrency(stats.availableBalance)}
                  </p>
                </div>
                <button
                  onClick={handleOpenWithdrawModal}
                  disabled={stats.availableBalance <= 0}
                  className={`px-4 py-2 rounded ${
                    stats.availableBalance > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* Total Payouts Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Payouts</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.totalPayouts)}
              </p>
            </div>

            {/* Total Refunds Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Refunds</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.totalRefunds)}
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Transaction Type Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("all")}
                className={`${
                  activeTab === "all"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setActiveTab("sale")}
                className={`${
                  activeTab === "sale"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Sales
              </button>
              <button
                onClick={() => setActiveTab("payout")}
                className={`${
                  activeTab === "payout"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Payouts
              </button>
              <button
                onClick={() => setActiveTab("refund")}
                className={`${
                  activeTab === "refund"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Refunds
              </button>
            </nav>
          </div>

          {/* Transactions Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction, index) => (
                    <tr key={transaction.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeClass(
                            transaction.type
                          )}`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={handleCloseWithdrawModal}
        onSuccess={handleWithdrawSuccess}
        currentBalance={stats.availableBalance}
      />
    </div>
  );
}

// Wrap the EarningsContent with ProtectedRoute
export default function SellerEarnings() {
  return (
    <ProtectedRoute>
      <EarningsContent />
    </ProtectedRoute>
  );
}
