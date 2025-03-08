"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);

  // Calculate discount percentage
  const discountPercentage = Math.round(
    ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
  );

  // Calculate total quantity across all sizes
  const totalQuantity = product.sizeQuantities
    ? Object.values(product.sizeQuantities).reduce(
        (sum, quantity) => sum + quantity,
        0
      )
    : 0;

  // Ensure images is always an array
  const images = Array.isArray(product.images) ? product.images : [];
  const firstImage = images.length > 0 ? images[0] : null;

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {/* Product Image */}
        <div className="aspect-square relative overflow-hidden bg-gray-100">
          {firstImage && !imageError ? (
            <Image
              src={firstImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              priority
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-medium">
              {discountPercentage}% OFF
            </div>
          )}

          {/* Out of Stock Badge */}
          {totalQuantity === 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {product.name}
          </h3>

          {/* Seller Info */}
          {product.seller && (
            <div className="mt-1 text-xs text-gray-500">
              <span className="font-medium">{product.seller.shopName}</span>
              {product.seller.city && (
                <span className="ml-1">
                  • {product.seller.city}
                  {product.seller.state && `, ${product.seller.state}`}
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                ₹{product.sellingPrice}
              </p>
              {product.mrpPrice > product.sellingPrice && (
                <p className="text-xs text-gray-500 line-through">
                  ₹{product.mrpPrice}
                </p>
              )}
            </div>

            {/* Available Sizes */}
            <div className="text-xs text-gray-500">
              {product.sizeQuantities &&
                Object.entries(product.sizeQuantities)
                  .filter(([_, quantity]) => quantity > 0)
                  .map(([size]) => size)
                  .join(", ")}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
