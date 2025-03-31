"use client";

import { useState, useEffect, use } from "react";
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

export default function ProductDetails({ params }) {
  // Unwrap params at the beginning of the component
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;

  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [colorInventories, setColorInventories] = useState([]);
  const { user, loading: authLoading } = useUserAuth();
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch(PUBLIC_ENDPOINTS.PRODUCT_DETAIL(productId));

        if (!res.ok) {
          throw new Error(`Failed to fetch product: ${res.status}`);
        }

        const data = await res.json();
        setProduct(data);

        // Fetch color inventories for this product
        try {
          const colorRes = await fetch(
            PUBLIC_ENDPOINTS.PRODUCT_COLORS(productId)
          );
          if (colorRes.ok) {
            const colorData = await colorRes.json();
            setColorInventories(colorData.colorInventories || []);

            // Set first available color as default
            if (
              colorData.colorInventories &&
              colorData.colorInventories.length > 0
            ) {
              const availableColors = colorData.colorInventories.filter(
                (color) =>
                  Object.values(color.inventory || {}).some((qty) => qty > 0)
              );

              if (availableColors.length > 0) {
                setSelectedColor(availableColors[0].color);
              }
            }
          }
        } catch (colorError) {
          console.error("Error fetching color inventories:", colorError);
        }

        // Set first available size as default selected
        if (data.sizeQuantities) {
          const availableSizes = Object.entries(data.sizeQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([size]) => size);

          if (availableSizes.length > 0) {
            setSelectedSize(availableSizes[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

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
    
    // Existing validations
    if (!selectedSize && Object.keys(product.sizeQuantities || {}).length > 0) {
      toast.error("Please select a size");
      return;
    }

    if (!selectedColor && colorInventories.length > 0) {
      toast.error("Please select a color");
      return;
    }

    try {
      setPaymentLoading(true);

      // Check if user is logged in and get tokens from localStorage
      const accessToken = localStorage.getItem("accessToken");
      const userData = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user"))
        : null;

      // Store auth data explicitly before redirect to ensure it persists
      if (accessToken && userData) {
        // Re-store the tokens to refresh their lifetime
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(userData));

        console.log("User authentication preserved before payment", {
          user: userData?.name || "Anonymous",
          isAuthenticated: !!accessToken,
        });
      }

      // Prepare the order data
      const orderData = {
        amount: product.sellingPrice,
        customer_id: user.id, // Use logged-in user's ID
        customer_email: user.email || `guest_${user.id}@example.com`, // Use user's email or generate one
        customer_phone: user.phone, // Use user's phone
        product_details: {
          product_id: productId,
          name: product.name,
          price: product.sellingPrice,
          size: selectedSize,
          color: selectedColor,
          quantity: 1,
        },
        // Include authentication data to preserve it
        auth: {
          isAuthenticated: !!accessToken,
          user_id: userData?.id,
        },
      };

      // Call your payment creation API
      const response = await fetch("/api/create-payment-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if user is logged in
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Payment API error:", errorData);
        throw new Error(
          errorData.details?.error_description ||
            errorData.message ||
            "Failed to create payment"
        );
      }

      // Get the payment session from the response
      const paymentData = await response.json();
      console.log("Payment session created:", paymentData);

      // Use window.location to redirect to Cashfree's hosted payment page
      if (paymentData.payment_link) {
        // If we have a direct payment link, use that instead
        console.log("Redirecting to payment link:", paymentData.payment_link);
        window.location.href = paymentData.payment_link;
      } else if (paymentData.payment_session_id) {
        // Store payment session info along with auth state
        localStorage.setItem(
          "payment_session",
          JSON.stringify({
            session_id: paymentData.payment_session_id,
            order_id: paymentData.order_id,
            auth: {
              isAuthenticated: !!accessToken,
              user_id: userData?.id,
            },
          })
        );

        console.log("Payment session stored in localStorage");
        toast.success("Proceeding to checkout...");
        router.push(
          `/checkout?session_id=${paymentData.payment_session_id}&order_id=${paymentData.order_id}`
        );
      } else {
        throw new Error("No payment session ID returned");
      }
    } catch (error) {
      console.error("Payment creation error:", error);
      toast.error(error.message || "Failed to proceed to checkout");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Function to add product to cart
  const handleAddToCart = async () => {
    if (authLoading) {
      toast("Checking authentication...");
      return; // Don't proceed if auth state is still loading
    }
    
    if (!user) {
      toast.error("Please log in or sign up first");
      router.push('/signup'); // Redirect to signup page
      return;
    }
    
    // Validate size and color selection
    if (!selectedSize && Object.keys(product.sizeQuantities || {}).length > 0) {
      toast.error("Please select a size");
      return;
    }

    if (!selectedColor && colorInventories.length > 0) {
      toast.error("Please select a color");
      return;
    }

    try {
      const response = await fetch(`/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          size: selectedSize,
          color: selectedColor,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add item to cart");
      }

      toast.success("Product added to cart!");
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error(error.message || "Failed to add to cart");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Product Not Found
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors"
        >
          <FiArrowLeft className="mr-2" /> Back to Home
        </Link>
      </div>
    );
  }

  // If product is loaded successfully
  if (product) {
    // Check if product is available
    const isSizeAvailable =
      Object.values(product.sizeQuantities || {}).some((qty) => qty > 0) ||
      Object.keys(product.sizeQuantities || {}).length === 0;

    const isColorAvailable =
      colorInventories.length === 0 ||
      colorInventories.some((color) =>
        Object.values(color.inventory || {}).some((qty) => qty > 0)
      );

    const isProductAvailable = isSizeAvailable && isColorAvailable;

    return (
      <div className="bg-background py-8">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-primary">
                  Home
                </Link>
              </li>
              <li className="flex items-center">
                <FiChevronRight className="h-4 w-4 mx-1" />
                <Link href="/products" className="hover:text-primary">
                  Products
                </Link>
              </li>
              <li className="flex items-center">
                <FiChevronRight className="h-4 w-4 mx-1" />
                <span className="text-gray-700 font-medium truncate max-w-xs">
                  {product.name}
                </span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Product Details */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-background-card rounded-lg shadow-sm overflow-hidden">
            {/* Product Images */}
            <div className="p-4 sm:p-6">
              <div className="flex flex-col">
                {/* Main Image */}
                <div className="relative h-80 sm:h-96 w-full mb-4 rounded-lg overflow-hidden bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[selectedImage]}
                      alt={product.name}
                      layout="fill"
                      objectFit="contain"
                      className="transition-opacity duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/placeholder-product.png";
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200 rounded-lg">
                      <FiShoppingBag className="h-16 w-16 text-gray-400" />
                      <span className="sr-only">No image available</span>
                    </div>
                  )}

                  {/* Discount badge */}
                  {product.mrpPrice && product.mrpPrice > product.sellingPrice && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {calculateDiscountPercentage()}% OFF
                    </div>
                  )}
                </div>

                {/* Thumbnail Images */}
                {product.images && product.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden ${
                          selectedImage === index
                            ? "ring-2 ring-primary"
                            : "ring-1 ring-gray-200"
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${product.name} - Image ${index + 1}`}
                          layout="fill"
                          objectFit="cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder-product.png";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4 sm:p-6 flex flex-col">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>

              {/* Seller info */}
              {product.seller && (
                <p className="text-sm text-gray-500 mb-4">
                  Sold by: {product.seller.shopName || "Unknown Seller"}
                </p>
              )}

              {/* Price */}
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold text-primary">
                  ₹{product.sellingPrice}
                </span>
                {product.mrpPrice && product.mrpPrice > product.sellingPrice && (
                  <>
                    <span className="ml-2 text-gray-500 line-through">
                      ₹{product.mrpPrice}
                    </span>
                    <span className="ml-2 text-green-600 text-sm font-medium">
                      Save ₹{product.mrpPrice - product.sellingPrice} (
                      {calculateDiscountPercentage()}%)
                    </span>
                  </>
                )}
              </div>

              {/* Colors */}
              {colorInventories.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Colors:
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-1">
                    {colorInventories.map((colorItem) => {
                      const colorName = colorItem.color;
                      // Check if any size for this color is available
                      const isAvailable = Object.values(
                        colorItem.inventory || {}
                      ).some((qty) => qty > 0);

                      return (
                        <button
                          key={colorName}
                          onClick={() => isAvailable && handleColorSelect(colorName)}
                          disabled={!isAvailable}
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            !isAvailable && "opacity-30 cursor-not-allowed"
                          } ${
                            selectedColor === colorName &&
                            "ring-2 ring-offset-2 ring-primary"
                          }`}
                          style={{
                            backgroundColor: colorName.toLowerCase(),
                            // Use contrasting color for text if needed
                            color:
                              /^(white|yellow|light|beige|cream)/i.test(
                                colorName
                              )
                                ? "#000"
                                : "#fff",
                          }}
                          title={`${colorName}${!isAvailable ? " (Out of stock)" : ""}`}
                        >
                          {selectedColor === colorName && (
                            <FiCheck className="h-5 w-5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedColor || "None"}
                  </p>
                </div>
              )}

              {/* Sizes */}
              {Object.keys(product.sizeQuantities || {}).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Size:
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-1">
                    {Object.entries(product.sizeQuantities || {}).map(
                      ([size, quantity]) => (
                        <button
                          key={size}
                          onClick={() => quantity > 0 && handleSizeSelect(size)}
                          disabled={quantity <= 0}
                          className={`px-3 py-1 border rounded-md ${
                            quantity <= 0 && "opacity-30 cursor-not-allowed"
                          } ${
                            selectedSize === size
                              ? "border-primary bg-primary text-white"
                              : "border-gray-300 hover:border-primary"
                          }`}
                        >
                          {size}
                        </button>
                      )
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedSize || "None"}
                  </p>
                </div>
              )}

              {/* Product Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Description:
                </h3>
                <div className="text-sm text-gray-600 prose">
                  {product.description ? (
                    <p>{product.description}</p>
                  ) : (
                    <p className="italic">No description available</p>
                  )}
                </div>
              </div>

              {/* Product Features/Attributes */}
              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Product Attributes:
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {Object.entries(product.attributes).map(([key, value]) => (
                      <div key={key} className="flex">
                        <dt className="font-medium text-gray-500 mr-1">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </dt>
                        <dd className="text-gray-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Availability */}
              <div className="mt-auto">
                <div className="mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isProductAvailable
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {isProductAvailable ? "In Stock" : "Out of Stock"}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={!isProductAvailable || paymentLoading}
                    className="flex-1 flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-dark hover:bg-primary-darker transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!isProductAvailable || paymentLoading}
                    className="flex-1 flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      "Buy Now"
                    )}
                  </button>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Delivery & Returns:
                </h3>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li className="flex items-center">
                    <FiTruck className="h-4 w-4 mr-2 text-gray-400" />
                    Free shipping on orders over ₹499
                  </li>
                  <li className="flex items-center">
                    <FiShield className="h-4 w-4 mr-2 text-gray-400" />
                    7-day return policy
                  </li>
                  <li className="flex items-center">
                    <FiCreditCard className="h-4 w-4 mr-2 text-gray-400" />
                    Secure Payment
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
