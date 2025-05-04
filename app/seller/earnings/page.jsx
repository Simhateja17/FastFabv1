"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import WithdrawModal from "@/components/modals/WithdrawModal";

// The actual earnings content
function EarningsContent() {
  const { seller, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState("30days");
  const [earnings, setEarnings] = useState([]);
  const [immediateEarnings, setImmediateEarnings] = useState([]);
  const [postWindowEarnings, setPostWindowEarnings] = useState([]);
  const [returnWindowAmount, setReturnWindowAmount] = useState(0);
  const [stats, setStats] = useState({
    totalSales: 0,
    platformFees: 0,
    netEarnings: 0,
    availableBalance: 0,
    immediateEarningsTotal: 0,
    postWindowEarningsTotal: 0,
    returnWindowAmount: 0,
    returnShippingFee: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [itemsInReturnWindow, setItemsInReturnWindow] = useState([]);

  // Remove the log for 'user', use 'seller'
  console.log("[EarningsContent] Seller from useAuth():", JSON.stringify(seller));

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        
        // UPDATED: Use Next.js API route instead of direct backend call
        // This fixes CORS issues in production by proxying through Next.js
        const url = new URL("/api/seller/earnings", window.location.origin);
        url.searchParams.append("period", dateRange);
        
        console.log(`[EarningsContent] Fetching earnings from: ${url.toString()}`);
        
        const data = await authFetch(url.toString());

        // Check if the backend returned a redirect instruction (usually for auth failures)
        if (data.redirect) {
          console.log(`[EarningsContent] Received redirect instruction to: ${data.redirect}`);
          window.location.href = data.redirect;
          return;
        }

        if (!data || typeof data !== 'object' || !data.earnings) {
             throw new Error('Invalid response format from API. Expected { earnings: [], stats: {} }');
         }

        setEarnings(data.earnings || []); // Use the 'earnings' key directly
        
        // Set new earnings data
        setImmediateEarnings(data.immediateEarnings || []);
        setPostWindowEarnings(data.postWindowEarnings || []);
        setReturnWindowAmount(data.returnWindowAmount || 0);

        // Safely access stats with fallback
        const periodStats = data.stats[dateRange]; // Get stats for the correct period
        if (periodStats && typeof periodStats === 'object') {
          setStats({
              totalSales: periodStats.totalSales || 0,
              platformFees: periodStats.totalCommission || 0, // Map commission to platformFees
              netEarnings: periodStats.netEarnings || 0,
              availableBalance: periodStats.availableBalance || 0,
              immediateEarningsTotal: periodStats.immediateEarningsTotal || 0,
              postWindowEarningsTotal: periodStats.postWindowEarningsTotal || 0,
              returnWindowAmount: periodStats.inReturnWindowAmount || 0, // Corrected key to match backend
              returnShippingFee: periodStats.returnShippingFee || 0 // Add Return Shipping fee
          });
        } else {
          // Default stats if not available or structure is wrong
          setStats({
            totalSales: 0,
            platformFees: 0,
            netEarnings: 0,
            availableBalance: 0,
            immediateEarningsTotal: 0,
            postWindowEarningsTotal: 0,
            returnWindowAmount: 0,
            returnShippingFee: 0
          });
        }

        // Update itemsInReturnWindow
        setItemsInReturnWindow(data.itemsInReturnWindow || []);
      } catch (err) {
        console.error('Error fetching earnings data:', err);
        setError(err.message);
        // Reset to default values on error
        setEarnings([]);
        setImmediateEarnings([]);
        setPostWindowEarnings([]);
        setReturnWindowAmount(0);
        setStats({
          totalSales: 0,
          platformFees: 0,
          netEarnings: 0,
          availableBalance: 0,
          immediateEarningsTotal: 0,
          postWindowEarningsTotal: 0,
          returnWindowAmount: 0,
          returnShippingFee: 0
        });
        setItemsInReturnWindow([]);
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
  }, [dateRange, authFetch, seller]);

  // Filter transactions based on active tab
  const filteredTransactions = earnings.filter((transaction) => {
    if (activeTab === "all") return true;
    if (activeTab === "return_window") return false; // Return window items are handled separately in JSX
    if (activeTab === "fulfilled") {
      // Show only transactions that are marked as 'COMPLETED'
      return transaction?.status?.toLowerCase() === 'completed';
    }
    // Fallback for any other potential tabs (though we removed them)
    // Ensure comparison is robust (case-insensitive and handles potential null/undefined type)
    // This part might not be strictly needed anymore but kept for robustness
    return transaction?.type?.toLowerCase() === activeTab.toLowerCase(); 
  });

  // Get transaction type badge color
  const getTypeBadgeClass = (type) => {
    if (!type) return "bg-gray-100 text-gray-800"; // Handle null/undefined types
    switch (type.toLowerCase()) {
      case "immediate":
        return "bg-green-100 text-green-800"; // Use clearer color names
      case "post_return_window":
        return "bg-blue-100 text-blue-800";
      case "sale":
        return "bg-green-100 text-green-800"; // Use clearer color names
      case "refund":
        return "bg-red-100 text-red-800";
      case "fee":
        return "bg-orange-100 text-orange-800"; // For Return Shipping fees
      case "platform_fee": // Add case for platform fees if they appear as transactions
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format a timestamp as a readable date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "₹0.00";
    
    // Ensure amount is a number and has proper precision before formatting
    const fixedAmount = parseFloat(parseFloat(amount).toFixed(2));
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(fixedAmount);
  };

  // Handle opening withdraw modal
  const handleOpenWithdrawModal = () => {
    setIsWithdrawModalOpen(true);
  };

  // Handle closing withdraw modal
  const handleCloseWithdrawModal = () => {
    setIsWithdrawModalOpen(false);
  };

  // Handle withdraw submit
  const handleWithdrawSubmit = async (amount) => {
    console.log(`Withdraw request for amount: ${amount}`);
    // Here you would call the API to create a withdraw request
    // For now, we'll just close the modal
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
                  {stats.returnShippingFee > 0 && (
                    <>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(stats.availableBalance + stats.returnShippingFee)} - {formatCurrency(stats.returnShippingFee)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Total Balance - Return Shipping Fee
                      </p>
                    </>
                  )}
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

            {/* In Return Window Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">In Return Window</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.returnWindowAmount)}
              </p>
              <p className="text-xs text-gray-500">Amounts for items still within return period</p>
            </div>
            
            {/* Return Shipping Fee Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Return Shipping Fee</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.returnShippingFee)}
              </p>
              <p className="text-xs text-gray-500">Rs47.20 per approved return</p>
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
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("all")}
                className={`${// All Transactions Tab
                  activeTab === "all"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                aria-current={activeTab === "all" ? "page" : undefined}
              >
                All Transactions
              </button>
              {/* Removed Immediate Earnings Tab */}
              {/* Removed Post-Window Earnings Tab */}
              <button
                onClick={() => setActiveTab("fulfilled")}
                className={`${// Fulfilled Orders Tab
                  activeTab === "fulfilled"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                aria-current={activeTab === "fulfilled" ? "page" : undefined}
              >
                Fulfilled Orders
              </button>
              <button
                onClick={() => setActiveTab("return_window")}
                className={`${// In Return Window Tab
                  activeTab === "return_window"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                aria-current={activeTab === "return_window" ? "page" : undefined}
              >
                In Return Window
              </button>
            </nav>
          </div>

          {/* Transactions List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {activeTab === "return_window" ? (
                // Display items currently in return window
                <>
                  <li className="px-6 py-4 bg-yellow-50">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-yellow-700">
                        These items are in the return window period. Once the return window closes, the earnings will be added to your available balance.
                      </p>
                    </div>
                  </li>
                  {itemsInReturnWindow && itemsInReturnWindow.length > 0 ? (
                    itemsInReturnWindow.map((item) => (
                      <li key={item.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                Return Window
                              </span>
                              <span className="ml-2 text-sm text-gray-900">
                                {item.orderId ? (
                                  <Link
                                    href={`/seller/orders/${item.orderId}`}
                                    className="hover:underline text-blue-600"
                                  >
                                    Order #{item.orderId.substring(0, 8)}...
                                  </Link>
                                ) : (
                                  "No order reference"
                                )}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {item.productName} (x{item.quantity})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-yellow-600">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                            <div className="flex items-center justify-end mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-xs text-yellow-600">Pending release</p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-6 py-8 text-center text-gray-500">
                      No items currently in return window
                    </li>
                  )}
                </>
              ) : filteredTransactions.length === 0 ? (
                <li className="px-6 py-8 text-center text-gray-500">
                  No transactions found
                </li>
              ) : (
                filteredTransactions.map((transaction) => (
                  <li key={transaction.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeClass(
                              transaction.type
                            )}`}
                          >
                            {transaction.type === "POST_RETURN_WINDOW" 
                              ? "Return Window Complete" 
                              : transaction.type || "Unknown"}
                          </span>
                          <span className="ml-2 text-sm text-gray-900">
                            {transaction.orderId ? (
                              <Link
                                href={`/seller/orders/${transaction.orderId}`}
                                className="hover:underline text-blue-600"
                              >
                                Order #{transaction.orderId.substring(0, 8)}...
                              </Link>
                            ) : (
                              "No order reference"
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(transaction.createdAt)}
                          {transaction.type === "POST_RETURN_WINDOW" && (
                            <span className="ml-2 text-green-600">
                              • Added to available balance
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-medium ${
                            transaction.type === "SALE" || transaction.type === "IMMEDIATE" || transaction.type === "POST_RETURN_WINDOW"
                              ? "text-green-600"
                              : transaction.type === "REFUND" || transaction.type === "fee"
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {transaction.amount < 0 ? "" : transaction.type === "REFUND" || transaction.type === "fee" ? "-" : "+"}{" "}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                        <p className="text-xs text-gray-500">
                          {transaction.status}
                          {transaction.type === "POST_RETURN_WINDOW" && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={handleCloseWithdrawModal}
        onSubmit={handleWithdrawSubmit}
        maxAmount={stats.availableBalance}
      />
    </div>
  );
}

export default function SellerEarnings() {
  return (
    <ProtectedRoute>
      <EarningsContent />
    </ProtectedRoute>
  );
}
