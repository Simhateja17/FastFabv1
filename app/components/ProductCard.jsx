"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FiMapPin, FiShoppingBag } from "react-icons/fi";

export default function ProductCard({ product, showSellerDistance = false }) {
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
  
  // Get distance to display (might be in product or product.seller)
  const distance = product.distance || (product.seller && product.seller.distance);

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="bg-background-card rounded-lg shadow-sm overflow-hidden transition-shadow group-hover:shadow-md border border-ui-border">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-background-alt">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-background-alt">
              <FiShoppingBag className="w-12 h-12 text-text-muted" />
            </div>
          )}

          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <div className="absolute top-2 left-2 bg-accent text-white text-xs px-2 py-1 rounded-full font-medium">
              {discountPercentage}% OFF
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3 sm:p-4">
          {/* Name */}
          <h3 className="text-sm sm:text-base font-medium text-text-dark mb-1 line-clamp-2">
            {product.name}
          </h3>

          {/* Category & Subcategory */}
          {(product.category || product.subcategory) && (
            <div className="flex items-start flex-wrap mb-2">
              <span className="text-xs text-text-muted">
                {product.category}
                {product.subcategory && ` • ${product.subcategory}`}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline">
            <span className="text-sm sm:text-base font-semibold text-secondary">
              ₹{product.sellingPrice}
            </span>
            {product.mrpPrice > product.sellingPrice && (
              <span className="ml-2 text-xs sm:text-sm text-text-muted line-through">
                ₹{product.mrpPrice}
              </span>
            )}
            {discountPercentage > 0 && (
              <span className="ml-2 text-xs text-accent">
                {discountPercentage}% off
              </span>
            )}
          </div>

          {/* Available Sizes */}
          {product.sizeQuantities && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(product.sizeQuantities)
                .filter(([_, quantity]) => quantity > 0)
                .map(([size]) => (
                  <span
                    key={size}
                    className="inline-block px-1.5 py-0.5 text-xs bg-background-alt rounded border border-ui-border"
                  >
                    {size}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
