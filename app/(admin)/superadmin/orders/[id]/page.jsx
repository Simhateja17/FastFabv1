"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from 'next/image';

// API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Order statuses
const ORDER_STATUSES = [
  {
    value: "PENDING",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "PROCESSING",
    label: "Processing",
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

export default function OrderDetailPage({ params }) {
  const orderId = params.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const router = useRouter();

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/admin/orders/${orderId}`
        );
        setOrder(response.data);
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
      await axios.patch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        status: newStatus,
      });
      setOrder({ ...order, status: newStatus });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert(error.response?.data?.message || "Failed to update order status");
    } finally {
      setStatusUpdateLoading(false);
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
                                  href={`/admin/superadmin/products/${item.product.id}`}
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
                      href={`/admin/superadmin/users/${order.user.id}`}
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
                  {order.shippingAddress.address || "N/A"}
                  {order.shippingAddress.address2 &&
                    `, ${order.shippingAddress.address2}`}
                  {order.shippingAddress.city &&
                    `, ${order.shippingAddress.city}`}
                  {order.shippingAddress.state &&
                    `, ${order.shippingAddress.state}`}
                  {order.shippingAddress.pincode &&
                    ` - ${order.shippingAddress.pincode}`}
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
