"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import getAdminApiClient from "@/app/utils/apiClient";
import { toast } from "react-hot-toast";

const ReturnsPage = () => {
  const [loading, setLoading] = useState(true);
  const [returnRequests, setReturnRequests] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiClient = getAdminApiClient();
      const response = await apiClient.get('/api/admin/returns');
      
      if (response.data && response.data.returns) {
        setReturnRequests(response.data.returns);
      } else {
        // Data structure doesn't match expectation - log and show error
        console.error('Invalid API response format:', response.data);
        setReturnRequests([]);
        setError('Failed to load return data - unexpected format');
      }
    } catch (error) {
      console.error('Error fetching return requests:', error);
      
      if (error.response?.status === 404) {
        setError('Return data endpoint not available (404). Please check server status.');
      } else {
        setError('Failed to load return requests');
      }
      
      setReturnRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
        <p>{error}</p>
        <button
          onClick={fetchReturns}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Returns & Refunds</h1>
        <button
          onClick={fetchReturns}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-lg font-semibold text-gray-800">Return Requests</h2>
            <div className="mt-2 sm:mt-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                <span className="h-2 w-2 rounded-full bg-yellow-400 mr-1"></span>
                Pending: {returnRequests.filter(r => r.status === 'PENDING').length}
              </span>
              <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                <span className="h-2 w-2 rounded-full bg-green-400 mr-1"></span>
                Approved: {returnRequests.filter(r => r.status === 'APPROVED').length}
              </span>
            </div>
          </div>
        </div>

        {returnRequests.length === 0 ? (
          <div className="text-center py-12">
            <svg 
              className="w-12 h-12 mx-auto text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
              />
            </svg>
            <p className="mt-4 text-gray-500">No return requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returnRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.returnReason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/superadmin/returns/${request.id}`)}
                        className="text-primary hover:text-primary-dark"
                      >
                        View Details
                      </button>
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
};

export default ReturnsPage; 