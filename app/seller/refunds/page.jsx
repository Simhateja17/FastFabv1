"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUserAuth } from "@/app/context/UserAuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual refunds content
function RefundsContent({ seller }) {
  const { userAuthFetch } = useUserAuth();
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState("");
  const [refunds, setRefunds] = useState([]); // This will hold the formatted return requests
  const [stats, setStats] = useState({
    totalRefundsAmount: 0,
    pendingRefundsCount: 0,
    refundRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRefunds = useCallback(async (statusFilter) => {
    try {
      setLoading(true);
      setError(null);

      if (!seller?.id) {
        console.error('No seller ID available');
        setError('Seller authentication required');
        setLoading(false);
        return;
      }
      
      // Construct API URL with status filter if not 'all'
      let apiUrl = '/api/seller/refunds';
      if (statusFilter && statusFilter !== 'all') {
        apiUrl += `?status=${statusFilter.toUpperCase()}`;
      }
      
      const data = await userAuthFetch(apiUrl);
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      
      // The API now returns `refunds` (which are formatted return requests) and `stats`
      setRefunds(data.refunds || []);
      setStats(data.stats || { totalRefundsAmount: 0, pendingRefundsCount: 0, refundRate: 0 });
      
    } catch (err) {
      console.error('Error fetching refunds:', err);
      setError(err.message);
      setRefunds([]);
      setStats({ totalRefundsAmount: 0, pendingRefundsCount: 0, refundRate: 0 });
    } finally {
      setLoading(false);
    }
  }, [seller?.id, userAuthFetch]); // Dependencies updated

  // Fetch initial data and refetch when tab changes
  useEffect(() => {
    if (seller?.id) {
      fetchRefunds(activeTab);
    } else {
      setLoading(false); // Don't load if not authenticated
    }
  }, [seller?.id, activeTab, fetchRefunds]);

  // Filter refunds locally based ONLY on search term (API handles status filtering)
  const filteredRefunds = refunds.filter((refund) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      refund.orderNumber?.toLowerCase().includes(searchTermLower) ||
      refund.customerName?.toLowerCase().includes(searchTermLower) ||
      refund.productName?.toLowerCase().includes(searchTermLower) ||
      refund.id?.toLowerCase().includes(searchTermLower) // Search by return request ID
    );
  });

  // Get status badge color - Use consistent colors
  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      // Add other potential statuses if needed
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      // maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Handle tab change
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    // Data will refetch via useEffect
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Refund Management
        </h1>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search by Order#, Customer, Product..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
           <svg className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         {/* Total Refunds Card */}
         <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-gray-500 text-sm">Total Approved Refunds (Last 30d)</p>
               <h3 className="text-2xl font-semibold text-gray-800 mt-1">
                 {loading ? <span className="h-8 bg-gray-200 rounded w-24 inline-block animate-pulse"></span> : formatCurrency(stats.totalRefundsAmount)}
               </h3>
             </div>
             <div className="p-3 bg-blue-100 rounded-full">
               <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>
             </div>
           </div>
         </div>

         {/* Pending Refunds Card */}
         <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-gray-500 text-sm">Pending Return Requests</p>
               <h3 className="text-2xl font-semibold text-gray-800 mt-1">
                 {loading ? <span className="h-8 bg-gray-200 rounded w-12 inline-block animate-pulse"></span> : stats.pendingRefundsCount}
               </h3>
             </div>
             <div className="p-3 bg-yellow-100 rounded-full">
               <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
           </div>
           <div className="mt-4">
             <span className={`text-xs ${stats.pendingRefundsCount > 0 ? 'text-yellow-700' : 'text-gray-500'}`}>
               {loading ? <span className="h-4 bg-gray-200 rounded w-32 inline-block animate-pulse"></span> : (stats.pendingRefundsCount > 0 ? "Awaiting admin review" : "No pending requests")}
             </span>
           </div>
         </div>

         {/* Refund Rate Card */}
         <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-gray-500 text-sm">Est. Refund Rate</p>
               <h3 className="text-2xl font-semibold text-gray-800 mt-1">
                  {loading ? <span className="h-8 bg-gray-200 rounded w-16 inline-block animate-pulse"></span> : `${stats.refundRate}%`}
               </h3>
             </div>
             <div className="p-3 bg-red-100 rounded-full">
               <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8M4 12a8 8 0 1116 0 8 8 0 01-16 0z" /></svg>
             </div>
           </div>
            <div className="mt-4">
              <span className="text-xs text-gray-500">
                 {loading ? <span className="h-4 bg-gray-200 rounded w-28 inline-block animate-pulse"></span> : "Based on approved returns"}
              </span>
            </div>
         </div>
       </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['all', 'pending', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Refunds Table/List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        {loading ? (
           <div className="p-6 text-center text-gray-500">Loading requests...</div>
        ) : error ? (
           <div className="p-6 text-center text-red-600">Error: {error}</div>
        ) : filteredRefunds.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No matching requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRefunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link href={`/seller/orders/${refund.orderId}`} className="text-blue-600 hover:text-blue-800">
                        {refund.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {refund.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(refund.submittedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {refund.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(refund.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(refund.status)}`}>
                        {refund.status}
                      </span>
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

// Wrap with ProtectedRoute HOC
export default function SellerRefunds() {
  return (
    <ProtectedRoute>
      {(seller) => <RefundsContent seller={seller} />}
    </ProtectedRoute>
  );
}
