"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiArrowLeft, FiCheck, FiPackage } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { USER_ENDPOINTS } from "@/app/config";

// Return reason options with icons
const returnReasons = [
  {
    id: "not-needed",
    label: "Product not needed anymore",
    description: "Didn't like the product or ordered by mistake",
    icon: "🛒",
  },
  {
    id: "quality-issue",
    label: "Quality issue",
    description: "Poor fabric/material, finishing or performance",
    icon: "❗",
  },
  {
    id: "size-fit-issue",
    label: "Size/Fit issue",
    description: "Tight or loose fitting",
    icon: "👕",
  },
  {
    id: "damaged",
    label: "Damaged/Used product",
    description: "Dirty, old, torn, or broken products",
    icon: "💔",
  },
  {
    id: "missing",
    label: "Item Missing in the package",
    description: "Part missing in product or got less quantity",
    icon: "📦",
  },
  {
    id: "wrong-product",
    label: "Different product delivered",
    description: "Received different size/color/product than ordered",
    icon: "🔄",
  },
];

export default function ReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const productName = searchParams.get("productName");
  const price = searchParams.get("price");
  
  const [selectedReason, setSelectedReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);

  const { userAuthFetch } = useUserAuth();

  useEffect(() => {
    const fetchOrderImage = async () => {
      if (!orderId || !userAuthFetch) return;

      setLoadingImage(true);
      try {
        const allOrders = await userAuthFetch(USER_ENDPOINTS.ORDERS);
        const currentOrder = allOrders.find(o => o.id === orderId);

        if (currentOrder && currentOrder.items?.[0]?.product?.images?.[0]) {
          setImageUrl(currentOrder.items[0].product.images[0]);
        } else {
          console.warn(`Image not found for order ${orderId}`);
        }
      } catch (error) {
        console.error("Error fetching order details for image:", error);
        toast.error("Could not load product image.");
      } finally {
        setLoadingImage(false);
      }
    };

    fetchOrderImage();
  }, [orderId, userAuthFetch]);

  useEffect(() => {
    if (!orderId) {
      toast.error("No order specified for return");
      router.push("/orders");
    }
  }, [orderId, router]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Please select a reason for return");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          productName,
          reason: selectedReason,
          price
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit return request");
      }

      if (orderId) {
        try {
          const returnedOrders = JSON.parse(localStorage.getItem("returnedOrders") || "[]");
          
          if (!returnedOrders.includes(orderId)) {
            returnedOrders.push(orderId);
            localStorage.setItem("returnedOrders", JSON.stringify(returnedOrders));
          }
        } catch (error) {
          console.error("Error saving returned order to localStorage:", error);
        }
      }
      
      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success("Return request submitted successfully");
    } catch (error) {
      console.error("Error submitting return request:", error);
      toast.error(error.message || "Failed to submit return request");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/orders"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2" />
          Back to Orders
        </Link>
      </div>

      {isSuccess ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="text-green-600 text-2xl" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Return Request Successful
          </h1>
          <p className="text-gray-600 mb-6">
            Your return request has been submitted successfully. We&apos;ll process it shortly.
          </p>
          <Link
            href="/orders"
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 inline-block"
          >
            Back to Orders
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h1 className="text-xl font-semibold text-gray-900">
              RETURN/EXCHANGE FOR #{orderId}
            </h1>
          </div>

          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Product Details
            </h2>
            <div className="flex items-start">
              <div className="bg-gray-100 w-16 h-16 rounded flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                {loadingImage ? (
                   <div className="animate-pulse bg-gray-300 w-full h-full"></div>
                ) : imageUrl ? (
                  <Image 
                    src={imageUrl} 
                    alt={productName || 'Product Image'} 
                    layout="fill"
                    objectFit="cover"
                    onError={(e) => { 
                      console.error("Image failed to load:", imageUrl);
                      e.target.onerror = null; 
                      e.target.src='/placeholder-image.svg';
                    }}
                  />
                ) : (
                   <FiPackage className="text-gray-400 text-2xl" />
                )}
              </div>
              <div className="ml-4">
                <div className="font-medium mb-1">{productName || "Product"}</div>
                <div className="text-sm text-gray-500 mb-2">Size: Free Size</div>
                <div className="font-medium">₹ {price || "0.00"}</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Please select reason for return/exchange
            </h2>

            <div className="space-y-3">
              {returnReasons.map((reason) => (
                <div
                  key={reason.id}
                  className={`border rounded-md p-4 cursor-pointer transition-colors ${
                    selectedReason === reason.id
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedReason(reason.id)}
                >
                  <div className="flex items-start">
                    <div className="mr-3 text-xl">{reason.icon}</div>
                    <div className="flex-grow">
                      <div className="font-medium">{reason.label}</div>
                      <div className="text-sm text-gray-500">
                        {reason.description}
                      </div>
                    </div>
                    <div className="ml-2">
                      <div
                        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                          selectedReason === reason.id
                            ? "border-black"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedReason === reason.id && (
                          <div className="w-3 h-3 rounded-full bg-black"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedReason && (
              <div className="mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Processing..." : "Confirm Return"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 