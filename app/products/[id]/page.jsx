"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PRODUCT_ENDPOINTS } from "@/app/config";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import {
  FiChevronRight,
  FiShoppingBag,
  FiArrowLeft,
  FiCheck,
  FiInfo,
  FiTruck,
  FiShield,
} from "react-icons/fi";

export default function ProductDetails({ params }) {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch(PRODUCT_ENDPOINTS.DETAIL(params.id));

        if (!res.ok) {
          throw new Error(`Failed to fetch product: ${res.status}`);
        }

        const data = await res.json();
        setProduct(data);

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

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

  const handleQuantityChange = (amount) => {
    const newQuantity = quantity + amount;

    if (newQuantity < 1) return;

    // Limit by available stock
    if (product && product.sizeQuantities && selectedSize) {
      const availableStock = product.sizeQuantities[selectedSize] || 0;
      if (newQuantity > availableStock) return;
    }

    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Please select a size");
      return;
    }

    // Add to cart logic would go here
    alert(`Added ${quantity} of size ${selectedSize} to cart`);
  };

  const calculateDiscountPercentage = () => {
    if (!product || !product.mrpPrice || !product.sellingPrice) return 0;
    return Math.round(
      ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
    );
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
            The product you're looking for doesn't exist or has been removed.
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
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm text-text-muted">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <FiChevronRight className="mx-2" />
            <Link
              href={`/products/category/${
                product.category?.toLowerCase() || "all"
              }`}
              className="hover:text-primary"
            >
              {product.category || "Products"}
            </Link>
            <FiChevronRight className="mx-2" />
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
            <div className="mb-4 aspect-square relative rounded-lg overflow-hidden bg-background-alt">
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
                  <FiShoppingBag className="w-16 h-16 text-text-muted" />
                </div>
              )}

              {/* Discount Badge */}
              {calculateDiscountPercentage() > 0 && (
                <div className="absolute top-4 left-4 bg-accent text-white px-2 py-1 rounded-md text-sm font-medium">
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
                    className={`relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border-2 ${
                      selectedImage === index
                        ? "border-secondary"
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
            {/* Category */}
            <div className="flex items-center mb-2">
              <span className="text-sm text-secondary font-medium">
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
              <span className="text-2xl font-bold text-primary mr-2">
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
                <div className="flex items-center text-success">
                  <FiCheck className="mr-2" />
                  <span>In Stock</span>
                </div>
              ) : (
                <div className="flex items-center text-error">
                  <FiInfo className="mr-2" />
                  <span>Out of Stock</span>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-text-dark mb-2">
                  Description
                </h2>
                <p className="text-text">{product.description}</p>
              </div>
            )}

            {/* Size Selection */}
            {Object.keys(product.sizeQuantities || {}).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-text-dark mb-2">
                  Select Size
                </h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(product.sizeQuantities).map(([size, qty]) => (
                    <button
                      key={size}
                      onClick={() => handleSizeSelect(size)}
                      disabled={qty <= 0}
                      className={`
                        h-10 min-w-[2.5rem] px-3 rounded-md border 
                        ${
                          selectedSize === size
                            ? "border-secondary bg-secondary bg-opacity-10 text-secondary"
                            : qty > 0
                            ? "border-ui-border bg-background-alt text-text hover:border-secondary"
                            : "border-ui-border bg-background-alt text-text-muted opacity-50 cursor-not-allowed"
                        }
                      `}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {isInStock && (
              <div className="mb-8">
                <h2 className="text-lg font-medium text-text-dark mb-2">
                  Quantity
                </h2>
                <div className="flex items-center">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-md border border-ui-border bg-background-alt text-text flex items-center justify-center disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={
                      !selectedSize ||
                      quantity >= (product.sizeQuantities?.[selectedSize] || 0)
                    }
                    className="w-10 h-10 rounded-md border border-ui-border bg-background-alt text-text flex items-center justify-center disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <div className="mb-8">
              <button
                onClick={handleAddToCart}
                disabled={!isInStock || !selectedSize}
                className="w-full py-3 px-6 bg-secondary text-white rounded-md font-medium hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <FiShoppingBag className="mr-2" />
                {isInStock ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="border-t border-ui-border pt-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <FiTruck className="text-secondary mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-text-dark">
                      30-Minute Delivery
                    </h3>
                    <p className="text-sm text-text-muted">
                      Get it delivered in just 30 minutes in Hyderabad
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <FiShield className="text-secondary mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-text-dark">
                      Quality Guarantee
                    </h3>
                    <p className="text-sm text-text-muted">
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
  );
}
