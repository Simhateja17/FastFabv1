"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PRODUCT_ENDPOINTS, PUBLIC_ENDPOINTS } from "@/app/config";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { useUserAuth } from "@/app/context/UserAuthContext";
import {
  FiChevronRight,
  FiShoppingBag,
  FiArrowLeft,
  FiCheck,
  FiInfo,
  FiTruck,
  FiShield,
  FiCreditCard,
  FiClock,
  FiPackage,
  FiBox,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import React from "react";

export default function ProductDetails({ params }) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const productId = unwrappedParams.id;

  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [colorInventories, setColorInventories] = useState([]);
  const { user, loading: authLoading } = useUserAuth();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [activeTab, setActiveTab] = useState("SPECIFICATION");

  // Effect 1: Fetch Data
  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const timestamp = Date.now();
        
        // Fetch product details
        const productRes = await fetch(`${PUBLIC_ENDPOINTS.PRODUCT_DETAIL(productId)}?_=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!productRes.ok) throw new Error(`Failed to fetch product: ${productRes.status}`);
        const productData = await productRes.json();
        setProduct(productData);
        console.log("Fetched product data:", productData);

        // Fetch color inventories
        const colorRes = await fetch(`${PUBLIC_ENDPOINTS.PRODUCT_COLORS(productId)}?_=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (colorRes.ok) {
          const colorData = await colorRes.json();
          setColorInventories(colorData.colorInventories || []);
          console.log("Fetched color inventories:", colorData.colorInventories);
        } else {
           console.warn("Failed to fetch color inventories:", colorRes.status);
           setColorInventories([]); // Ensure it's an empty array on failure
        }

      } catch (error) {
        console.error("Error fetching product data:", error);
        setError(error.message);
        // Reset states on error
        setProduct(null);
        setColorInventories([]);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchProduct();
    }
    
    // Set up polling (optional, keep if needed)
    const refreshInterval = setInterval(() => {
      console.log("Polling: Refreshing product data...");
      if (productId) {
        fetchProduct();
      }
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [productId]);

  // Effect 2: Set Default Color (only runs when data loads)
  useEffect(() => {
    if (product && colorInventories.length > 0 && !selectedColor) {
      const firstAvailableColor = colorInventories.find((inv) =>
        Object.values(inv.inventory || {}).some((qty) => parseInt(qty) > 0)
      );
      if (firstAvailableColor) {
        setSelectedColor(firstAvailableColor.color);
        console.log("Default color set:", firstAvailableColor.color);
      }
    }
    // Reset color if product is removed or inventories become empty
    else if (!product || colorInventories.length === 0) {
        setSelectedColor("");
    }
  }, [product, colorInventories, selectedColor]); // Add selectedColor to dependency array

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  const calculateDiscountPercentage = () => {
    if (!product || !product.mrpPrice || !product.sellingPrice) return 0;
    return Math.round(
      ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
    );
  };

  // Calculate sizes available for selected color
  const availableSizes = useMemo(() => {
    if (!selectedColor || !colorInventories.length) return [];
    
    const colorData = colorInventories.find(inv => inv.color === selectedColor);
    if (!colorData?.inventory) return [];
    
    return Object.entries(colorData.inventory)
      .filter(([_, qty]) => parseInt(qty) > 0)
      .map(([size]) => size);
  }, [selectedColor, colorInventories]);

  // Set default size when available sizes change
  useEffect(() => {
    if (availableSizes.length > 0 && !selectedSize) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  // Handle size selection
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

  // Format price with INR currency
  const formatPrice = (price) => {
    if (!price) return "₹0";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Function to handle the "Buy Now" button click
  const handleBuyNow = async () => {
    // Check if user is logged in
    if (authLoading) {
      toast("Checking authentication...");
      return; // Don't proceed if auth state is still loading
    }
    
    if (!user) {
      toast.error("Please log in or sign up to buy this product.");
      router.push('/signup'); // Redirect to signup page
      return;
    }
    
    // Remove size validation, only check for color
    if (!selectedColor && colorInventories.length > 0) {
      toast.error("Please select a color");
      return;
    }

    try {
      setPaymentLoading(true);
      
      // Select the first available size for the selected color
      let firstAvailableSize = "";
      if (selectedColor && colorInventories.length > 0) {
        const colorData = colorInventories.find((inv) => inv.color === selectedColor);
        if (colorData?.inventory) {
          const availableSizes = Object.entries(colorData.inventory)
            .filter(([_, qty]) => parseInt(qty) > 0)
            .map(([size]) => size);
          if (availableSizes.length > 0) {
            firstAvailableSize = availableSizes[0];
          }
        }
      }
      
      // Prepare the order data - Now include user details if available
      const orderData = {
        amount: product.sellingPrice,
        customer_id: user.id, // Use logged-in user's ID
        customer_email: user.email || `guest_${user.id}@example.com`, // Use user's email or generate one
        customer_phone: user.phone, // Use user's phone
        product_details: {
          product_id: productId,
          name: product.name,
          price: product.sellingPrice,
          size: firstAvailableSize, // Use automatically selected size
          color: selectedColor,
          quantity: 1
        }
      };

      // Call your payment creation API
      const response = await fetch("/api/create-payment-order", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment");
      }

      // Get the payment session from the response
      const paymentData = await response.json();
      
      // Use router.push for client-side navigation
      if (paymentData.payment_session_id) {
        toast.success("Proceeding to checkout...");
        router.push(`/checkout?session_id=${paymentData.payment_session_id}&order_id=${paymentData.order_id}`);
      } else {
        throw new Error("Payment initialization failed: No session ID received");
      }
      
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment initialization failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Add item to cart
  const handleAddToCart = () => {
    if (authLoading) {
      toast("Checking authentication...");
      return;
    }
    
    if (!user) {
      toast.error("Please log in or sign up to add items to your bag.");
      router.push('/signup');
      return;
    }
    
    if (!selectedColor && colorInventories.length > 0) {
      toast.error("Please select a color");
      return;
    }
    
    if (!selectedSize && availableSizes.length > 0) {
      toast.error("Please select a size");
      return;
    }
    
    // Add to cart logic
    // This would typically call a function from your cart store
    toast.success("Added to bag!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Error Loading Product
          </h2>
          <p className="text-text-muted mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-secondary hover:bg-secondary-dark text-white px-6 py-3 rounded-md transition-colors"
          >
            <FiArrowLeft className="mr-2" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Product Not Found
          </h2>
          <p className="text-text-muted mb-6">
            The product you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-secondary hover:bg-secondary-dark text-white px-6 py-3 rounded-md transition-colors"
          >
            <FiArrowLeft className="mr-2" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Calculate total quantity across all sizes
  const totalQuantity = product.sizeQuantities
    ? Object.values(product.sizeQuantities).reduce(
        (sum, quantity) => sum + quantity,
        0
      )
    : 0;

  // Check if product is in stock
  const isInStock = totalQuantity > 0;

  // Ensure images is always an array
  const images = Array.isArray(product.images) ? product.images : [];

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-primary">
            Home
          </Link>
          <FiChevronRight className="mx-2 text-gray-400" />
          <Link href={`/products/category/${product.category?.toLowerCase()}`} className="text-gray-500 hover:text-primary">
            {product.category || "Products"}
          </Link>
          <FiChevronRight className="mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        {/* Product section */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Image gallery - Left side */}
          <div className="mb-8 lg:mb-0">
            <div className="flex">
              {/* Thumbnails column */}
              <div className="flex flex-col gap-3 mr-3">
                {product.images && product.images.map((image, idx) => (
                  <div
                    key={idx}
                    className={`w-16 h-16 border cursor-pointer ${selectedImage === idx ? 'border-primary' : 'border-gray-200'}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={image}
                        alt={`${product.name} - View ${idx + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Main image */}
              <div className="flex-1 relative aspect-square border border-gray-200">
                {product.images && product.images.length > 0 ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={product.images[selectedImage]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <FiShoppingBag className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product details - Right side */}
          <div>
            {/* Product name */}
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            {/* Pricing */}
            <div className="flex items-center mt-4 mb-6">
              <span className="text-xl md:text-2xl font-bold text-gray-900 mr-3">
                {formatPrice(product.sellingPrice)}
              </span>
              {product.mrpPrice && product.mrpPrice > product.sellingPrice && (
                <>
                  <span className="text-sm text-gray-500 line-through mr-3">
                    MRP: {formatPrice(product.mrpPrice)}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {calculateDiscountPercentage()}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-6">(Inclusive of all taxes)</p>

            {/* Color selection */}
            {colorInventories.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Color: {selectedColor}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colorInventories.map((colorData) => (
                    <button
                      key={colorData.color}
                      onClick={() => handleColorSelect(colorData.color)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        selectedColor === colorData.color
                          ? "border-primary"
                          : "border-transparent"
                      }`}
                      style={{
                        backgroundColor: colorData.color.toLowerCase(),
                        boxShadow: selectedColor === colorData.color ? "0 0 0 2px #fff, 0 0 0 4px #3b82f6" : "none",
                      }}
                      aria-label={`Select ${colorData.color} color`}
                    ></button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selection */}
            {availableSizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Size: {selectedSize}
                  </span>
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    Size Chart
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSizeSelect(size)}
                      className={`
                        w-12 h-12 rounded-md border text-sm font-medium
                        ${
                          selectedSize === size
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
                        }
                      `}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={paymentLoading}
                className="w-full bg-black text-white py-3 px-4 rounded-md font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {paymentLoading ? (
                  <LoadingSpinner size="small" color="primary" />
                ) : (
                  "Buy Now"
                )}
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <FiClock className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs font-medium">30 Min Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <FiShield className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs font-medium">Secure Payments</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <FiBox className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs font-medium">Genuine Product</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <FiPackage className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs font-medium">1 Day Return</span>
              </div>
            </div>

            {/* Product information tabs */}
            <div className="border-t border-gray-200 mt-8">
              {/* Tab buttons */}
              <div className="flex border-b border-gray-200">
                <button
                  className={`py-3 px-4 text-sm font-medium ${
                    activeTab === "SPECIFICATION"
                      ? "border-b-2 border-primary text-primary"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("SPECIFICATION")}
                >
                  SPECIFICATION
                </button>
                <button
                  className={`py-3 px-4 text-sm font-medium ${
                    activeTab === "DESCRIPTION"
                      ? "border-b-2 border-primary text-primary"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("DESCRIPTION")}
                >
                  DESCRIPTION
                </button>
              </div>

              {/* Tab content */}
              <div className="py-4">
                {activeTab === "SPECIFICATION" && (
                  <div className="divide-y divide-gray-200">
                    {/* Category */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Category</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.categoryDetails?.name || "Ethnic & Fusion Wear"}
                      </span>
                    </div>

                    {/* Sub Category */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Sub Category</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.subcategoryDetails?.name || "Kurtas"}
                      </span>
                    </div>

                    {/* Product Type */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Product Type</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.pattern || "Sequence"}
                      </span>
                    </div>

                    {/* Size */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Size</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedSize || availableSizes[0] || "Standard"}
                      </span>
                    </div>

                    {/* Fit */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Fit</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.fit || "Regular Fit"}
                      </span>
                    </div>

                    {/* Fabric */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Fabric</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.material || "Cotton Blend"}
                      </span>
                    </div>

                    {/* Pattern */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Pattern</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.pattern || "Sequence"}
                      </span>
                    </div>

                    {/* Neck Type */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Neck Type</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.neckType || "Mandarin"}
                      </span>
                    </div>

                    {/* Product Code */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Product Code</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.sku || `K-${product.id?.slice(-4)}`}
                      </span>
                    </div>

                    {/* Origin Country */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">Origin Country</span>
                      <span className="text-sm font-medium text-gray-900">
                        India
                      </span>
                    </div>

                    {/* From */}
                    <div className="py-3 grid grid-cols-2">
                      <span className="text-sm text-gray-500">From</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.seller?.storeName || product.seller?.name || "FastFab Seller"}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === "DESCRIPTION" && (
                  <div className="prose prose-sm max-w-none">
                    <p>{product.description || "No description available for this product."}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

