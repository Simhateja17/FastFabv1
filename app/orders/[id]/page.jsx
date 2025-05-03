"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { USER_ENDPOINTS } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import {
  FiArrowLeft,
  FiPackage,
  FiTruck,
  FiCheck,
  FiClock,
  FiMapPin,
  FiUser,
  FiPhone,
  FiMail,
  FiCreditCard,
} from "react-icons/fi";

export default function OrderDetail({ params }) {
  const router = useRouter();
  const orderId = params.id;
  const { user, userAuthFetch, loading: authLoading } = useUserAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userAuthFetch(
        `${USER_ENDPOINTS.ORDER_DETAIL(orderId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError(
        "We couldn't load this order. Please try again or contact support."
      );
    } finally {
      setLoading(false);
    }
  }, [userAuthFetch, orderId]);

  // Fetch order details on component mount
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to view order details");
      router.push("/signin");
      return;
    }

    fetchOrderDetails();
  }, [user, authLoading, router, orderId, fetchOrderDetails]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "shipped":
        return "text-purple-600 bg-purple-100";
      case "delivered":
        return "text-green-600 bg-green-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      case "refunded":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return <FiClock />;
      case "processing":
        return <FiPackage />;
      case "shipped":
        return <FiTruck />;
      case "delivered":
        return <FiCheck />;
      default:
        return <FiClock />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getPaymentMethodName = (method) => {
    if (!method) return "N/A";

    switch (method.toLowerCase()) {
      case "cod":
        return "Cash on Delivery";
      case "card":
        return "Credit/Debit Card";
      case "upi":
        return "UPI";
      case "wallet":
        return "Wallet";
      default:
        return method;
    }
  };

  // Helper function to check if the current time is within the return window
  const isWithinReturnWindow = () => {
    if (!order) return false;
    
    const now = new Date();
    
    // If returnWindowStart and returnWindowEnd are defined, use them for the check
    if (order.returnWindowStart && order.returnWindowEnd) {
      try {
        const startTime = new Date(order.returnWindowStart);
        const endTime = new Date(order.returnWindowEnd);
        
        console.log(`Order ${order.id} - Now: ${now}, Start: ${startTime}, End: ${endTime}`);
        
        return now >= startTime && now <= endTime;
      } catch (error) {
        console.error("Error parsing return window dates:", error);
        // Fall through to default behavior
      }
    }
    
    // If no explicit window or error parsing dates, calculate based on order date
    if (order.createdAt) {
      const orderDate = new Date(order.createdAt);
      
      // Default return window: 1 day (24 hours) from order confirmation
      const defaultWindowDays = 1;
      const defaultEndTime = new Date(orderDate);
      defaultEndTime.setDate(orderDate.getDate() + defaultWindowDays);
      
      console.log(`Order ${order.id} - Using default window: Now: ${now}, Created: ${orderDate}, End: ${defaultEndTime}`);
      
      return now <= defaultEndTime;
    }
    
    return false; // No valid date information found
  };
  
  // Helper function to check if product is returnable
  const isProductReturnable = () => {
    if (!order || !order.items || order.items.length === 0) return false;
    
    // Check if the primary product is returnable
    return order.items[0]?.product?.isReturnable || false;
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push("/orders")}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2" />
          Back to Orders
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-lg text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchOrderDetails}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : order ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="p-6 border-b">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                      Order #{order.orderId || order.id}
                    </h1>
                    <p className="text-gray-500">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status || "Processing"}
                    </span>
                  </div>
                </div>
                
                {/* Display Return Status if available */}
                {order.returnStatus && (
                  <div className={`mt-4 p-3 rounded ${
                    order.returnStatus === 'APPROVED' ? 'bg-green-50 text-green-700' :
                    order.returnStatus === 'REJECTED' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    <p className="font-medium">{order.returnStatusMessage || 'Return in Process'}</p>
                    {order.returnStatus === 'REJECTED' && (
                      <p className="text-sm mt-1">
                        Please contact customer support for more information.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Return Item Button */}
                {!order.returnStatus && order.status === "CONFIRMED" && isProductReturnable() && isWithinReturnWindow() && (
                  <div className="mt-4">
                    <button
                      onClick={() => router.push(`/returns?orderId=${order.id}&productName=${order.items?.[0]?.product?.name || ''}&price=${order.totalAmount}`)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Return Item
                    </button>
                  </div>
                )}
                
                {/* Display return window info if applicable */}
                {!order.returnStatus && order.status === "CONFIRMED" && isProductReturnable() && !isWithinReturnWindow() && order.returnWindowEnd && (
                  <div className="mt-4 p-3 rounded bg-gray-50 text-gray-700">
                    <p className="text-sm">
                      Return window closed on {formatDate(order.returnWindowEnd)}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="p-6">
                <h2 className="text-lg font-medium mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex border-b pb-4">
                      <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                        {item.product?.images?.[0] ? (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex-grow">
                        <h3 className="font-medium">
                          {item.product?.name || "Product"}
                        </h3>
                        <div className="text-sm text-gray-500 mb-1">
                          {item.size && (
                            <span className="mr-3">Size: {item.size}</span>
                          )}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-sm text-gray-600">
                            Qty: {item.quantity}
                          </div>
                          <div>
                            <div className="font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                            {item.quantity > 1 && (
                              <div className="text-xs text-gray-500">
                                {formatCurrency(item.price)} each
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="mt-6 border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span>{formatCurrency(order.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span>{formatCurrency(order.taxAmount)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount</span>
                        <span className="text-green-600">
                          -{formatCurrency(order.discount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-base pt-2 border-t mt-2">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">Order Timeline</h2>
              <div className="space-y-8">
                {order.timeline && order.timeline.length > 0 ? (
                  order.timeline.map((event, index) => (
                    <div key={index} className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div
                          className={`rounded-full p-2 ${
                            event.completed
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {getStatusIcon(event.status)}
                        </div>
                        {index < order.timeline.length - 1 && (
                          <div
                            className={`h-full w-0.5 ${
                              event.completed ? "bg-green-400" : "bg-gray-200"
                            }`}
                          ></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{event.status}</h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(event.timestamp)}
                        </p>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`rounded-full p-2 ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {order.status || "Processing"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your order has been placed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <FiUser className="text-gray-400 mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium">
                      {order.customer?.name || user?.name || "Customer"}
                    </h3>
                    <p className="text-sm text-gray-500">Customer</p>
                  </div>
                </div>

                {(order.customer?.email || user?.email) && (
                  <div className="flex items-start">
                    <FiMail className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium">
                        {order.customer?.email || user?.email}
                      </h3>
                      <p className="text-sm text-gray-500">Email</p>
                    </div>
                  </div>
                )}

                {(order.customer?.phone || user?.phone) && (
                  <div className="flex items-start">
                    <FiPhone className="text-gray-400 mt-1 mr-3" />
                    <div>
                      <h3 className="font-medium">
                        {order.customer?.phone || user?.phone}
                      </h3>
                      <p className="text-sm text-gray-500">Phone</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-medium mb-4">Shipping Address</h2>
                <div className="flex items-start">
                  <FiMapPin className="text-gray-400 mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium">
                      {order.shippingAddress.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.shippingAddress.street},{" "}
                      {order.shippingAddress.city}
                      <br />
                      {order.shippingAddress.state},{" "}
                      {order.shippingAddress.country}{" "}
                      {order.shippingAddress.zipCode}
                    </p>
                    {order.shippingAddress.phone && (
                      <p className="text-sm text-gray-500 mt-1">
                        {order.shippingAddress.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">Payment Information</h2>
              <div className="flex items-start">
                <FiCreditCard className="text-gray-400 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium">
                    {getPaymentMethodName(order.paymentMethod)}
                  </h3>
                  <p className="text-sm text-gray-500">Payment Method</p>

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span
                        className={
                          order.paymentStatus?.toLowerCase() === "paid"
                            ? "text-green-600"
                            : order.paymentStatus?.toLowerCase() === "failed"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }
                      >
                        {order.paymentStatus || "Pending"}
                      </span>
                    </div>
                    {order.transactionId && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Transaction ID</span>
                        <span className="font-mono text-xs">
                          {order.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Notes */}
            {order.notes && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium mb-2">Notes</h2>
                <p className="text-gray-600 text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">Order not found</p>
        </div>
      )}
    </div>
  );
}
