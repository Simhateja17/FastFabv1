"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { FiMapPin, FiShoppingBag } from "react-icons/fi";

export default function ProductCard({ product, showSellerDistance = false }) {
  const [imageError, setImageError] = useState(false);
  const [currentSizes, setCurrentSizes] = useState([]);

  // Process available sizes on component mount and when product changes
  useEffect(() => {
    if (product?.sizeQuantities) {
      // Get available sizes by filtering those with quantity > 0
      const availableSizes = Object.entries(product.sizeQuantities)
        .filter(([_, quantity]) => parseInt(quantity) > 0)
        .map(([size]) => size)
        .sort(); // Sort sizes for consistency
      
      console.log(`ProductCard - Product ${product.id} available sizes:`, availableSizes);
      setCurrentSizes(availableSizes);
    } else {
      setCurrentSizes([]);
    }
  }, [product]);

  // Calculate discount percentage
  const discountPercentage = Math.round(
    ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
  );

  // Calculate total quantity across all sizes
  const totalQuantity = product.sizeQuantities
    ? Object.values(product.sizeQuantities).reduce(
        (sum, quantity) => sum + parseInt(quantity),
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
            <div className="absolute top-0 left-0 bg-accent text-white text-xs font-medium px-2 py-1 m-2 rounded">
              {discountPercentage}% OFF
            </div>
          )}
          
          {/* Stock Badge */}
          {totalQuantity > 0 ? (
            <div className="absolute bottom-0 right-0 bg-green-500 text-white text-xs font-medium px-2 py-1 m-2 rounded">
              In Stock
            </div>
          ) : (
            <div className="absolute bottom-0 right-0 bg-red-500 text-white text-xs font-medium px-2 py-1 m-2 rounded">
              Out of Stock
            </div>
          )}
        </div>

        <div className="p-3">
          {/* Product Name */}
          <h3 className="font-medium text-text-dark line-clamp-1 mb-1">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center">
            <span className="text-primary font-medium">
              ₹{product.sellingPrice}
            </span>
            {product.mrpPrice > product.sellingPrice && (
              <span className="ml-2 text-text-muted text-xs line-through">
                ₹{product.mrpPrice}
              </span>
            )}
          </div>

          {/* Available Sizes */}
          {currentSizes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {currentSizes.map((size) => (
                <span 
                  key={size} 
                  className="inline-block px-1.5 py-0.5 bg-gray-100 text-xs rounded border border-gray-200"
                >
                  {size}
                </span>
              ))}
            </div>
          )}

          {/* Seller/Distance (if applicable) */}
          {showSellerDistance && product.seller && (
            <div className="flex items-center mt-1 text-xs text-text-muted">
              <FiMapPin className="mr-1 h-3 w-3" />
              <span className="truncate">
                {product.seller.shopName || "Unknown seller"}
                {distance && ` • ${distance.toFixed(1)} km`}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
