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
  }, [product, colorInventories]); // Rerun only when product or inventories change

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  const calculateDiscountPercentage = () => {
    if (!product || !product.mrpPrice || !product.sellingPrice) return 0;
    return Math.round(
      ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
    );
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
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-background-alt border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm text-text-muted">
            <Link href="/" className="text-primary">
              Home
            </Link>
            <FiChevronRight className="mx-2 text-primary" />
            <Link
              href={`/products/category/${
                product.category?.toLowerCase() || "all"
              }`}
              className="text-primary"
            >
              {product.category || "Products"}
            </Link>
            <FiChevronRight className="mx-2 text-primary" />
            <span className="text-text-dark truncate max-w-[150px]">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
          >
            <FiArrowLeft className="mr-2" /> Back to Products
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row -mx-4">
          {/* Product Images */}
          <div className="lg:w-1/2 px-4 mb-8 lg:mb-0">
            <div className="mb-4 aspect-square relative rounded-lg overflow-hidden bg-background-alt border border-ui-border shadow-sm">
              {images.length > 0 ? (
                <Image
                  src={images[selectedImage]}
                  alt={product.name}
                  fill
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-background-alt flex items-center justify-center">
                  <FiShoppingBag className="w-16 h-16 text-secondary" />
                </div>
              )}

              {/* Discount Badge */}
              {calculateDiscountPercentage() > 0 && (
                <div className="absolute top-4 left-4 bg-accent text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                  {calculateDiscountPercentage()}% OFF
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all ${
                      selectedImage === index
                        ? "border-secondary shadow-md"
                        : "border-transparent"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - view ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:w-1/2 px-4">
            <div className="bg-background-card rounded-lg border border-ui-border p-6 shadow-sm">
              {/* Category */}
              <div className="flex items-center mb-2">
                <span className="text-sm bg-primary bg-opacity-10 text-white  rounded-full px-3 py-1">
                  {product.category}
                  {product.subcategory && ` • ${product.subcategory}`}
                </span>
              </div>

              {/* Product Name */}
              <h1 className="text-3xl font-bold text-text-dark mb-4">
                {product.name}
              </h1>

              {/* Pricing */}
              <div className="flex items-baseline mb-6">
                <span className="text-2xl font-bold text-secondary   mr-2">
                  ₹{product.sellingPrice}
                </span>
                {product.mrpPrice > product.sellingPrice && (
                  <span className="text-lg text-text-muted line-through">
                    ₹{product.mrpPrice}
                  </span>
                )}
                {calculateDiscountPercentage() > 0 && (
                  <span className="ml-2 text-sm text-accent font-medium">
                    Save {calculateDiscountPercentage()}%
                  </span>
                )}
              </div>

              {/* Availability */}
              <div className="mb-6">
                {isInStock ? (
                  <div className="flex items-center text-success bg-success bg-opacity-10 px-3 py-2 rounded-md inline-block">
                    <FiCheck className="mr-2 text-white" />
                    <span className="font-medium text-white">In Stock</span>
                  </div>
                ) : (
                  <div className="flex items-center text-error bg-error bg-opacity-10 px-3 py-2 rounded-md inline-block">
                    <FiInfo className="mr-2 text-white" />
                    <span className="font-medium text-white">Out of Stock</span>
                  </div>
                )}
              </div>

              {/* Color Inventory Display ONLY - Moved here between In Stock and Buy Now */}
              {selectedColor && colorInventories.length > 0 && (
                <div className="mb-6">
                  <div className="bg-primary bg-opacity-15 p-5 rounded-lg border border-primary border-opacity-30 shadow-sm">
                    <h3 className="text-base font-medium text-primary mb-3">
                      {selectedColor} Inventory:
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {colorInventories.find((c) => c.color === selectedColor)
                        ?.inventory &&
                        Object.entries(
                          colorInventories.find(
                            (c) => c.color === selectedColor
                          ).inventory
                        )
                          .filter(([_, qty]) => parseInt(qty) > 0)
                          .map(([size, qty]) => (
                            <div
                              key={`${selectedColor}-${size}`}
                              className="bg-white px-4 py-2 rounded-md shadow-sm border border-ui-border flex items-center"
                            >
                              <span className="text-sm font-medium text-primary mr-2">
                                {size}:
                              </span>
                              <span className="text-sm font-medium text-secondary">
                                {qty} available
                              </span>
                            </div>
                          ))}
                      {!colorInventories.find(
                        (c) => c.color === selectedColor
                      )?.inventory ||
                      Object.values(
                        colorInventories.find(
                          (c) => c.color === selectedColor
                        )?.inventory || {}
                      ).every((qty) => parseInt(qty) === 0) ? (
                        <span className="text-sm text-error bg-error bg-opacity-10 px-3 py-1.5 rounded-md">
                          Out of stock
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Color Selection */}
              {colorInventories.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-medium text-text-dark mb-3">
                    Select Color
                  </h2>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {colorInventories.map((colorInv) => {
                      // Check if this color has any inventory
                      const hasInventory = Object.values(
                        colorInv.inventory || {}
                      ).some((qty) => parseInt(qty) > 0);
                      if (!hasInventory) return null;

                      return (
                        <button
                          key={colorInv.color}
                          onClick={() => handleColorSelect(colorInv.color)}
                          disabled={!hasInventory}
                          className={`
                            flex flex-col items-center p-3 rounded-md border transition-all
                            ${
                              selectedColor === colorInv.color
                                ? "border-secondary bg-secondary bg-opacity-10 shadow-md"
                                : "border-ui-border bg-background-alt hover:border-secondary hover:shadow-sm"
                            }
                          `}
                        >
                          <div
                            className="w-10 h-10 rounded-full border border-ui-border shadow-sm mb-1"
                            style={{
                              backgroundColor: colorInv.colorCode || "#000000",
                            }}
                          ></div>
                          <span className="text-sm font-medium text-white">
                            {colorInv.color}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-text-dark mb-2">
                    Description
                  </h2>
                  <div className="bg-background-alt p-4 rounded-lg border border-ui-border">
                    <p className="text-text whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-ui-border my-6"></div>

              {/* Buy Now Button */}
              <div className="mb-6">
                <button
                  onClick={handleBuyNow}
                  disabled={!isInStock || paymentLoading || authLoading}
                  className={`w-full flex items-center justify-center bg-primary hover:bg-primary-dark text-white py-3 px-4 rounded-md transition-all ${
                    !isInStock || paymentLoading || authLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {authLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Loading...
                    </>
                  ) : paymentLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiCreditCard className="mr-2" />
                      Buy Now
                    </>
                  )}
                </button>
                {!isInStock && (
                  <p className="text-error text-sm mt-2 text-center">
                    This product is currently out of stock
                  </p>
                )}
              </div>

              {/* Feature Highlights */}
              <div className="border-t border-ui-border pt-6 mt-6">
                <div className="space-y-4">
                  <div className="flex items-start bg-secondary bg-opacity-5 p-3 rounded-lg">
                    <div className="bg-secondary bg-opacity-10 p-2 rounded-full text-secondary mr-3">
                      <FiTruck size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-dark">
                        30-Minute Delivery
                      </h3>
                      <p className="text-sm text-text-dark">
                        Get it delivered in just 30 minutes in Hyderabad
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start bg-secondary bg-opacity-5 p-3 rounded-lg">
                    <div className="bg-secondary bg-opacity-10 p-2 rounded-full text-secondary mr-3">
                      <FiShield size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-dark">
                        Quality Guarantee
                      </h3>
                      <p className="text-sm text-text-dark">
                        Returns accepted within 24 hours of delivery
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

