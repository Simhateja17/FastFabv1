"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Image from 'next/image';
import { toast } from "react-hot-toast";
import { getAdminApiClient } from "@/app/utils/apiClient";

// Return statuses configuration
const RETURN_STATUSES = [
  {
    value: "PENDING",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "APPROVED",
    label: "Approved",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    color: "bg-red-100 text-red-800",
  }
];

export default function ReturnDetailPage() {
  const params = useParams();
  const returnId = params.id;
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [refundCalculation, setRefundCalculation] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const router = useRouter();

  // Fetch return request details
  useEffect(() => {
    const fetchReturnDetails = async () => {
      try {
        // Get API client with admin authorization
        const apiClient = getAdminApiClient();
        
        const response = await apiClient.get(
          `/api/admin/returns/${returnId}`
        );
        
        setReturnData(response.data);
        setAdminNotes(response.data.adminNotes || "");

        // If return request is approved, fetch refund calculation
        if (response.data.returnRequest?.status === "APPROVED") {
          fetchRefundCalculation();
        }
      } catch (error) {
        console.error("Error fetching return details:", error);
        setError(
          error.response?.data?.message || "Failed to load return details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReturnDetails();
  }, [returnId]);

  // Fetch refund calculation from backend
  const fetchRefundCalculation = async () => {
    try {
      setRefundLoading(true);
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      // Try the refund endpoint directly since calculation may not exist
      const response = await apiClient.get(
        `/api/admin/returns/${returnId}/refund-calculation`
      );
      
      setRefundCalculation(response.data);
    } catch (error) {
      console.error("Error fetching refund calculation:", error);
      toast.error("Failed to load refund calculation");
      
      // Fall back to manual calculation if API fails
      if (returnData?.returnRequest?.amount) {
        // Create backup calculation based on fixed processing fee
        const processingFee = 50;
        const originalAmount = returnData.returnRequest.amount + processingFee;
        const refundAmount = returnData.returnRequest.amount;
        
        setRefundCalculation({
          originalAmount,
          processingFee,
          refundAmount,
          refundNote: "Partial refund with Rs. 50 processing fee deducted",
          fromApi: false // Flag that this was calculated client-side
        });
      }
    } finally {
      setRefundLoading(false);
    }
  };

  // Update return status
  const updateReturnStatus = async (newStatus) => {
    try {
      setStatusUpdateLoading(true);
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      await apiClient.patch(`/api/admin/returns/${returnId}/status`, {
        status: newStatus,
        adminNotes
      });
      
      // Update local state
      setReturnData({
        ...returnData,
        returnRequest: {
          ...returnData.returnRequest,
          status: newStatus
        }
      });
      
      toast.success(`Return request status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating return status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update return status"
      );
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Approve return request
  const approveReturn = () => {
    updateReturnStatus("APPROVED");
  };

  // Reject return request
  const rejectReturn = () => {
    if (!adminNotes) {
      toast.error("Please add a note explaining why the return is being rejected");
      return;
    }
    updateReturnStatus("REJECTED");
  };

  // Save admin notes
  const saveAdminNotes = async () => {
    try {
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      await apiClient.patch(`/api/admin/returns/${returnId}/status`, {
        status: returnData.returnRequest.status,
        adminNotes
      });
      
      toast.success("Notes saved successfully");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    }
  };

  // Process refund through Cashfree API
  const processRefund = async () => {
    try {
      setStatusUpdateLoading(true);
      
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      // Call the refund API endpoint
      await apiClient.post(`/api/admin/returns/${returnId}/refund`, {
        // Include the refund amount if we calculated it client-side as a fallback
        ...(refundCalculation && !refundCalculation.fromApi && { refundAmount: refundCalculation.refundAmount }),
        refundNote: adminNotes || refundCalculation?.refundNote || "Partial refund with processing fee deducted"
      });
      
      // Update the status to completed
      await apiClient.patch(`/api/admin/returns/${returnId}/status`, {
        status: "COMPLETED",
        adminNotes: adminNotes ? `${adminNotes}; Refund processed` : "Refund processed"
      });
      
      // Update local state
      setReturnData({
        ...returnData,
        returnRequest: {
          ...returnData.returnRequest,
          status: "COMPLETED"
        }
      });
      
      toast.success("Refund processed successfully");
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error(
        error.response?.data?.message || "Failed to process refund"
      );
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    const statusObj = RETURN_STATUSES.find((s) => s.value === status);
    return statusObj ? statusObj.color : "bg-gray-100 text-gray-800";
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  // Format payment method
  const formatPaymentMethod = (method) => {
    if (!method) return "N/A";

    const methodMap = {
      CREDIT_CARD: "Credit Card",
      DEBIT_CARD: "Debit Card",
      UPI: "UPI",
      WALLET: "Wallet",
      COD: "Cash on Delivery",
      NET_BANKING: "Net Banking",
    };

    return methodMap[method] || method;
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <Link
          href="/superadmin/returns"
          className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Back to Returns
        </Link>
      </div>
    );
  }

  const { returnRequest, customer, order, item, seller, shippingAddress } = returnData || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <Link
          href="/superadmin/returns"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Returns
        </Link>
      </div>

      {/* Return request header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Return Request
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              ID: {returnRequest?.id}
            </p>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-semibold ${getStatusBadgeClass(returnRequest?.status)}`}>
            {returnRequest?.status}
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Return ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {returnRequest?.id}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Order ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <Link
                  href={`/superadmin/orders/${returnRequest?.orderId}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {order?.orderNumber || returnRequest?.orderId}
                </Link>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Submitted Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(returnRequest?.submittedAt)}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Refund Amount</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatCurrency(returnRequest?.amount)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Return reason and admin actions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Return Reason & Admin Actions
          </h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-2">Return Reason</h4>
            <div className="bg-gray-50 p-4 rounded-lg text-gray-800">
              {returnRequest?.reason || "No reason provided"}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-2">Admin Notes</h4>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm p-3 text-gray-800 focus:ring-primary focus:border-primary"
              rows={4}
              placeholder="Add notes about this return request..."
            ></textarea>
            <button
              onClick={saveAdminNotes}
              className="mt-2 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
            >
              Save Notes
            </button>
          </div>

          {returnRequest?.status === "PENDING" && (
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button
                onClick={approveReturn}
                disabled={statusUpdateLoading}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md font-medium disabled:opacity-50"
              >
                {statusUpdateLoading ? "Processing..." : "Approve Return"}
              </button>
              <button
                onClick={rejectReturn}
                disabled={statusUpdateLoading}
                className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-md font-medium disabled:opacity-50"
              >
                {statusUpdateLoading ? "Processing..." : "Reject Return"}
              </button>
            </div>
          )}

          {returnRequest?.status === "APPROVED" && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-2">Process Refund</h4>
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                {refundLoading ? (
                  <p className="text-blue-600">Calculating refund amount...</p>
                ) : refundCalculation ? (
                  <>
                    <p className="text-sm text-blue-800">
                      <strong>Original Order Amount:</strong> {formatCurrency(refundCalculation.originalAmount)}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Processing Fee:</strong> {formatCurrency(refundCalculation.processingFee)}
                    </p>
                    <p className="text-sm text-blue-800 font-medium mt-2">
                      <strong>Refund Amount:</strong> {formatCurrency(refundCalculation.refundAmount)}
                    </p>
                    <p className="text-sm text-gray-600 italic mt-1">{refundCalculation.refundNote}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-blue-800">
                      <strong>Original Order Amount:</strong> {formatCurrency(returnRequest?.amount + 50)}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Refund Amount:</strong> {formatCurrency(returnRequest?.amount)} 
                      <span className="ml-2 text-gray-600">(Rs. 50 processing fee deducted)</span>
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={processRefund}
                disabled={statusUpdateLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium disabled:opacity-50"
              >
                {statusUpdateLoading 
                  ? "Processing..." 
                  : refundLoading 
                    ? "Loading refund details..." 
                    : refundCalculation 
                      ? `Process Refund (${formatCurrency(refundCalculation.refundAmount)})` 
                      : "Process Refund"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product information */}
      {item && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Product Information
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3">
                  {item.productImages && item.productImages.length > 0 ? (
                    <div className="relative h-64 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={item.productImages[0]}
                        alt={item.productName}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          console.error("Image failed to load:", item.productImages[0]);
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 300 300' fill='%23eee'%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='%23aaa'%3ENo Image Available%3C/text%3E%3C/svg%3E";
                        }}
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    </div>
                  ) : (
                    <div className="relative h-64 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="text-xl font-semibold">{item.productName}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">Size:</p>
                      <p className="font-medium">{item.size || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Color:</p>
                      <p className="font-medium">{item.color || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantity:</p>
                      <p className="font-medium">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price:</p>
                      <p className="font-medium">{formatCurrency(item.price)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer information */}
      {customer && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Customer Information
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {customer.name || "N/A"}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {customer.email || "N/A"}
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {customer.phone || "N/A"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Shipping Address */}
      {shippingAddress && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Shipping Address
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="p-6 space-y-2">
              <p className="text-gray-900 font-medium">
                {shippingAddress.name || "N/A"}
              </p>
              <p className="text-gray-900">
                {shippingAddress.phone || "N/A"}
              </p>
              <p className="text-gray-900 whitespace-pre-line">
                {shippingAddress.displayAddress || 
                 shippingAddress.line1 || 
                 shippingAddress.address || "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seller information */}
      {seller && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Seller Information
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Shop Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {seller.shopName || "N/A"}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {seller.phone || "N/A"}
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {seller.address
                    ? `${seller.address}, ${seller.city || ""}, ${
                        seller.state || ""
                      } ${seller.pincode || ""}`
                    : "N/A"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
} 