"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Image from 'next/image';
import { toast } from "react-hot-toast";
import { getAdminApiClient } from "@/app/utils/apiClient";

// API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || "http://localhost:8000";

// Order statuses
const ORDER_STATUSES = [
  {
    value: "PENDING",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "SHIPPED",
    label: "Shipped",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    color: "bg-green-100 text-green-800",
  },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800" },
  {
    value: "RETURNED",
    label: "Returned",
    color: "bg-orange-100 text-orange-800",
  },
];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [sellerInfo, setSellerInfo] = useState(null);
  const [sellers, setSellers] = useState([]);
  const router = useRouter();

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        // Get API client with admin authorization
        const apiClient = getAdminApiClient();
        
        const response = await apiClient.get(
          `/api/admin/orders/${orderId}`
        );
        setOrder(response.data);
        setAdminNotes(response.data.adminNotes || "");
        
        // Fetch seller info if primarySellerId is available
        if (response.data.primarySellerId) {
          try {
            const sellerResponse = await apiClient.get(
              `/api/admin/sellers/${response.data.primarySellerId}`
            );
            setSellerInfo(sellerResponse.data);
            setSellers([sellerResponse.data]);
          } catch (sellerError) {
            console.error("Error fetching seller details:", sellerError);
          }
        } else if (response.data.items && response.data.items.length > 0) {
          // Collect all unique seller IDs from order items
          const sellerIds = new Set();
          const sellersList = [];
          
          // Get seller IDs from items
          for (const item of response.data.items) {
            if (item.sellerId && !sellerIds.has(item.sellerId)) {
              sellerIds.add(item.sellerId);
              
              try {
                const sellerResponse = await apiClient.get(
                  `/api/admin/sellers/${item.sellerId}`
                );
                sellersList.push(sellerResponse.data);
                
                // Set the first seller as the primary sellerInfo for backward compatibility
                if (sellersList.length === 1) {
                  setSellerInfo(sellerResponse.data);
                }
              } catch (sellerError) {
                console.error(`Error fetching seller details for ID ${item.sellerId}:`, sellerError);
              }
            }
          }
          
          setSellers(sellersList);
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        setError(
          error.response?.data?.message || "Failed to load order details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Update order status
  const updateOrderStatus = async (newStatus) => {
    try {
      setStatusUpdateLoading(true);
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      await apiClient.patch(`/api/admin/orders/${orderId}/status`, {
        status: newStatus,
      });
      setOrder({ ...order, status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update order status"
      );
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Accept order after confirming with seller
  const acceptOrder = async () => {
    try {
      setStatusUpdateLoading(true);
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      await apiClient.put(`/api/admin/orders/${orderId}`, {
        status: "CONFIRMED",
        adminNotes,
      });
      setOrder({
        ...order,
        status: "CONFIRMED",
        adminProcessed: true,
        sellerConfirmed: true,
        adminNotes,
      });
      toast.success("Order accepted and marked for processing");
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error(error.response?.data?.message || "Failed to accept order");
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Reject order (seller doesn't have stock)
  const rejectOrder = async () => {
    if (!adminNotes) {
      toast.error("Please add a note explaining why the order is being rejected");
      return;
    }

    try {
      setStatusUpdateLoading(true);
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      await apiClient.put(`/api/admin/orders/${orderId}`, {
        status: "CANCELLED",
        adminNotes,
      });
      setOrder({
        ...order,
        status: "CANCELLED",
        adminProcessed: true,
        sellerConfirmed: false,
        adminNotes,
      });
      toast.success("Order rejected and customer will be notified");
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast.error(error.response?.data?.message || "Failed to reject order");
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Save admin notes
  const saveAdminNotes = async () => {
    try {
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();
      
      await apiClient.put(`/api/admin/orders/${orderId}`, {
        adminNotes,
      });
      toast.success("Notes saved successfully");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusObj = ORDER_STATUSES.find((s) => s.value === status);
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
          href="/admin/superadmin/orders"
          className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            href="/admin/superadmin/orders"
            className="inline-flex items-center text-primary hover:text-primary-dark mb-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-text">
            Order #{order.orderNumber || order.id.substring(0, 8)}
          </h1>
          <p className="text-text-muted">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(
              order.status
            )}`}
          >
            {order.status}
          </span>
          <select
            value={order.status}
            onChange={(e) => updateOrderStatus(e.target.value)}
            disabled={statusUpdateLoading}
            className="border border-ui-border rounded-md py-1 px-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admin Actions Panel - New Addition */}
      {order.status === 'PENDING' && !order.adminProcessed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Admin Action Required</h2>
          <p className="text-yellow-700 mb-4">
            Please contact the seller to confirm if they have the item(s) in stock before processing this order.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-1">Seller Information:</h3>
              {sellerInfo ? (
                <div className="p-3 bg-white rounded border border-gray-200">
                  <p className="font-semibold">{sellerInfo.shopName || 'Unknown Shop'}</p>
                  <p><span className="font-medium">Phone:</span> {sellerInfo.phone || 'N/A'}</p>
                  <p><span className="font-medium">Address:</span> {[
                    sellerInfo.address,
                    sellerInfo.city,
                    sellerInfo.state,
                    sellerInfo.pincode
                  ].filter(Boolean).join(', ') || 'N/A'}</p>
                  
                  <Link 
                    href={`/superadmin/sellers/${sellerInfo.id}`}
                    className="text-primary hover:underline text-sm mt-2 inline-block"
                  >
                    View Seller Profile
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">Seller information not available</p>
              )}
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-1">Admin Notes:</h3>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 h-24 text-sm"
                placeholder="Add notes about this order (e.g., communication with seller)"
              ></textarea>
              <button
                onClick={saveAdminNotes}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded mt-1"
              >
                Save Notes
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={acceptOrder}
              disabled={statusUpdateLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              Accept Order (Items Available)
            </button>
            
            <button
              onClick={rejectOrder}
              disabled={statusUpdateLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              Reject Order (Items Unavailable)
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-background-card rounded-lg shadow mb-6">
            <div className="p-6 border-b border-ui-border">
              <h2 className="text-lg font-medium text-text">Order Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ui-border">
                <thead className="bg-background-alt">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <tr key={index} className="hover:bg-background-alt">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-background-alt rounded-md overflow-hidden relative">
                              {item.product?.images &&
                              item.product.images.length > 0 ? (
                                <Image
                                  src={item.product.images[0]}
                                  alt={item.product.name || 'Product image'}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40' fill='%23eee'%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23aaa'%3ENoImg%3C/text%3E%3C/svg%3E";
                                  }}
                                  sizes="40px"
                                />
                              ) : (
                                <div className="h-10 w-10 flex items-center justify-center text-text-muted">
                                  No img
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-text">
                                {item.productName ||
                                  item.product?.name ||
                                  "Unknown Product"}
                              </div>
                              {item.product && (
                                <Link
                                  href={`/superadmin/products/${item.product.id}`}
                                  className="text-xs text-primary hover:text-primary-dark"
                                >
                                  View Product
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-text">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-text">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-text font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-4 text-center text-sm text-text-muted"
                      >
                        No items found in this order
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-background-alt">
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-sm font-medium text-text-muted"
                    >
                      Subtotal
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-text">
                      {formatCurrency(order.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-sm font-medium text-text-muted"
                    >
                      Shipping
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-text">
                      {formatCurrency(order.shippingCost)}
                    </td>
                  </tr>
                  {order.discount > 0 && (
                    <tr>
                      <td
                        colSpan="3"
                        className="px-6 py-3 text-right text-sm font-medium text-text-muted"
                      >
                        Discount
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-green-600">
                        -{formatCurrency(order.discount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-sm font-medium text-text-muted"
                    >
                      Tax
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-text">
                      {formatCurrency(order.tax)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-ui-border">
                    <td
                      colSpan="3"
                      className="px-6 py-3 text-right text-base font-bold text-text"
                    >
                      Total
                    </td>
                    <td className="px-6 py-3 text-right text-base font-bold text-text">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Large Product Image Section */}
          {order.items && order.items.length > 0 && (
            <div className="bg-background-card rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-medium text-text mb-4">
                Product Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {order.items.map((item, index) => (
                  <div key={index} className="flex flex-col">
                    <div className="relative w-full h-80 bg-background-alt rounded-lg overflow-hidden mb-4">
                      {item.product?.images && item.product.images.length > 0 ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name || item.productName || 'Product image'}
                          fill
                          className="object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 300 300' fill='%23eee'%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='%23aaa'%3ENo Image Available%3C/text%3E%3C/svg%3E";
                          }}
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          No image available
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-text">
                      {item.productName || item.product?.name || "Unknown Product"}
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-text-muted">Price</p>
                        <p className="font-medium">{formatCurrency(item.price)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">Quantity</p>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      {item.size && (
                        <div>
                          <p className="text-sm text-text-muted">Size</p>
                          <p className="font-medium">{item.size}</p>
                        </div>
                      )}
                      {item.color && (
                        <div>
                          <p className="text-sm text-text-muted">Color</p>
                          <p className="font-medium">{item.color}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-text-muted">Seller</p>
                      <p className="font-medium">{item.seller?.shopName || "Unknown Seller"}</p>
                    </div>
                    {item.product && (
                      <Link
                        href={`/superadmin/products/${item.product.id}`}
                        className="mt-3 text-primary hover:text-primary-dark text-sm inline-flex items-center"
                      >
                        <span>View Product Details</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline and Activity */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="bg-background-card rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-text mb-4">
                Order Timeline
              </h2>
              <div className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full h-8 w-8 flex items-center justify-center border-2 border-primary text-white bg-primary">
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {index < order.statusHistory.length - 1 && (
                        <div className="h-full w-0.5 bg-primary-dark/20"></div>
                      )}
                    </div>
                    <div className="ml-4 pb-6">
                      <p className="text-sm font-medium text-text">
                        <span
                          className={`px-2 py-0.5 rounded ${getStatusColor(
                            history.status
                          )}`}
                        >
                          {history.status}
                        </span>
                      </p>
                      <p className="text-sm text-text-muted">
                        {formatDate(history.timestamp)}
                      </p>
                      {history.comment && (
                        <p className="mt-1 text-sm text-text">
                          {history.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer, Shipping and Payment Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Info */}
          <div className="bg-background-card rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-text mb-4">
              Customer Information
            </h2>

            {order.user ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-text-muted">Name</p>
                  <p className="text-text font-medium">
                    {order.user.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Email</p>
                  <p className="text-text">{order.user.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Phone</p>
                  <p className="text-text">{order.user.phone || "N/A"}</p>
                </div>
                {order.user.id && (
                  <div className="pt-2">
                    <Link
                      href={`/superadmin/users/${order.user.id}`}
                      className="text-primary hover:text-primary-dark text-sm"
                    >
                      View Customer Profile
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-muted">Customer details not available</p>
            )}
          </div>

          {/* Shipping Address */}
          <div className="bg-background-card rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-text mb-4">
              Shipping Address
            </h2>

            {order.shippingAddress ? (
              <div className="space-y-2">
                <p className="text-text font-medium">
                  {order.shippingAddress.name || order.user?.name || "N/A"}
                </p>
                <p className="text-text">
                  {order.shippingAddress.phone || order.user?.phone || "N/A"}
                </p>
                <p className="text-text whitespace-pre-line">
                  {order.shippingAddress.displayAddress || 
                   order.shippingAddress.line1 || 
                   order.shippingAddress.address || "N/A"}
                </p>
              </div>
            ) : (
              <p className="text-text-muted">Shipping address not available</p>
            )}
          </div>

          {/* Payment Information */}
          <div className="bg-background-card rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-text mb-4">
              Payment Information
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-muted">Payment Method</p>
                <p className="text-text font-medium">
                  {formatPaymentMethod(order.paymentMethod)}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Payment Status</p>
                <p
                  className={`font-medium ${
                    order.paymentStatus === "PAID"
                      ? "text-green-600"
                      : order.paymentStatus === "PENDING"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {order.paymentStatus || "N/A"}
                </p>
              </div>
              {order.transactionId && (
                <div>
                  <p className="text-sm text-text-muted">Transaction ID</p>
                  <p className="text-text">{order.transactionId}</p>
                </div>
              )}
              {order.paymentDate && (
                <div>
                  <p className="text-sm text-text-muted">Payment Date</p>
                  <p className="text-text">{formatDate(order.paymentDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Seller Information - Added to be visible regardless of order status */}
          <div className="bg-background-card rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-text mb-4">
              Seller Information
            </h2>
            
            {sellers && sellers.length > 0 ? (
              <div className="space-y-5">
                {sellers.map((seller, index) => (
                  <div key={seller.id || index} className={index > 0 ? "pt-4 border-t border-ui-border" : ""}>
                    {sellers.length > 1 && (
                      <p className="text-sm font-medium text-text-muted mb-2">Seller #{index + 1}</p>
                    )}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-text-muted">Shop Name</p>
                        <p className="text-text font-medium">{seller.shopName || 'Unknown Shop'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">Phone</p>
                        <p className="text-text">{seller.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text-muted">Address</p>
                        <p className="text-text">{[
                          seller.address,
                          seller.city,
                          seller.state,
                          seller.pincode
                        ].filter(Boolean).join(', ') || 'N/A'}</p>
                      </div>
                      <div className="pt-2">
                        <Link 
                          href={`/superadmin/sellers/${seller.id}`}
                          className="text-primary hover:text-primary-dark text-sm"
                        >
                          View Seller Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">Seller information not available</p>
            )}
          </div>

          {/* Notes or Additional Information */}
          {order.notes && (
            <div className="bg-background-card rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-text mb-4">
                Order Notes
              </h2>
              <p className="text-text whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
