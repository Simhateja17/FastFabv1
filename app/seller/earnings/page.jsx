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

  // Handle closing the withdraw modal
  const handleCloseWithdrawModal = () => {
    setIsWithdrawModalOpen(false);
  };

  // --- NEW: Handler for successful withdrawal --- 
  const handleWithdrawSuccess = (newBalance) => {
      console.log('Withdrawal success callback received. New balance:', newBalance);
      setStats(prevStats => ({ 
          ...prevStats,
          // Update availableBalance immediately for better UX
          availableBalance: newBalance, 
          // Optionally, update totalPayouts if the API provides that, 
          // otherwise, it might be better to refetch stats after modal closes.
      }));
      // Close the modal (already handled by WithdrawModal itself after a delay)
      // setIsWithdrawModalOpen(false); 
      // Maybe refetch stats after a delay to ensure totalPayouts etc. are updated
      // setTimeout(fetchEarnings, 3000); // Example: Refetch after 3s
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading earnings data...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 mt-10">Error loading earnings: {error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Earnings Dashboard
        </h1>

        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              dateRange === "7days"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
            onClick={() => setDateRange("7days")}
          >
            7 Days
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b ${
              dateRange === "30days"
                 ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
            onClick={() => setDateRange("30days")}
          >
            30 Days
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
              dateRange === "90days"
                 ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
            onClick={() => setDateRange("90days")}
          >
            90 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sales</h3>
          <p className="text-2xl font-semibold text-gray-800">{formatCurrency(stats.totalSales)}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Platform Fees</h3>
          <p className="text-2xl font-semibold text-gray-800">{formatCurrency(stats.platformFees)}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Net Earnings</h3>
          <p className="text-2xl font-semibold text-gray-800">{formatCurrency(stats.netEarnings)}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Available Balance</h3>
            <p className="text-2xl font-semibold text-gray-800">{formatCurrency(stats.availableBalance)}</p>
          </div>
          <button
            onClick={handleOpenWithdrawModal}
            disabled={stats.availableBalance <= 0}
            className="mt-3 w-full bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {[
            { key: "all", label: "All Transactions" },
            { key: "sale", label: "Sales" },
            { key: "refund", label: "Refunds" },
            { key: "payout", label: "Payouts" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Details
                </th>
                 <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order ID
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeClass(
                          transaction.type
                        )}`}
                      >
                        {transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                      {transaction.description || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                       {transaction.orderId ? (
                        <Link href={`/seller/orders/${transaction.orderId}`} className="text-blue-600 hover:underline">
                          {transaction.orderId}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                      {formatCurrency(transaction.balanceAfter || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No transactions found for the selected period or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={handleCloseWithdrawModal}
        availableBalance={stats.availableBalance}
        onWithdrawSuccess={handleWithdrawSuccess}
      />
    </div>
  );
}

// Wrap the content component with ProtectedRoute
export default function SellerEarnings() {
  return (
    <ProtectedRoute allowedRoles={['seller']}>
      <EarningsContent />
    </ProtectedRoute>
  );
}
