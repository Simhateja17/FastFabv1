"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { useCartStore } from '../lib/cartStore';
import { useWishlistStore } from '../lib/wishlistStore';
import { useRouter } from 'next/navigation';

export default function ProductCard({ product }) {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addItem);
  const addToWishlist = useWishlistStore((state) => state.addItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product?.id));

  if (!product) {
    // Render placeholder/skeleton if no product
    return (
      <div className="bg-gray-100 rounded-lg p-4 h-80 animate-pulse">
        <div className="bg-gray-200 h-48 rounded-md mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  const {
    id,
    name,
    price,
    sellingPrice,
    discountPercentage,
    images,
    category,
    isOutOfStock,
  } = product;

  // Format price with INR currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Calculate discount percentage if not provided
  const discount = discountPercentage || (price && sellingPrice
    ? Math.round(100 - ((sellingPrice / price) * 100))
    : 0);

  // Get the first image URL or use a placeholder
  const imageUrl = images && images.length > 0 
    ? images[0] 
    : 'https://via.placeholder.com/300';

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    addToCart({
      id,
      name,
      price: sellingPrice || price,
      image: imageUrl,
      quantity: 1,
      // For products with size, you might want to use a modal or redirect to product page
      size: 'M' // Default size, adjust as needed
    });

    // Optional: Show toast or notification
  };

  const handleAddToWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();

    addToWishlist({
      id,
      name,
      price: sellingPrice || price,
      image: imageUrl,
    });

    // Optional: Show toast or notification
  };

  return (
    <Link
      href={`/products/${id}`}
      className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {/* Using Next.js Image component for better performance */}
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            alt={name || 'Product image'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center"
            onError={(e) => {
              // Fallback when image fails to load
              e.currentTarget.src = 'https://via.placeholder.com/300?text=No+Image';
            }}
          />
        </div>

        {/* Discount tag */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
            {discount}% OFF
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium text-lg">Out of Stock</span>
          </div>
        )}

        {/* Quick action buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleAddToWishlist}
            className={`p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 ${
              isInWishlist ? 'text-red-500' : 'text-gray-700'
            }`}
          >
            <FiHeart className={isInWishlist ? 'fill-current' : ''} />
          </button>
          
          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 text-gray-700"
            >
              <FiShoppingCart />
            </button>
          )}
        </div>
      </div>

      {/* Product details */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
          {name}
        </h3>
        
        <p className="text-xs text-gray-500 mb-2">
          {category || 'General'}
        </p>
        
        <div className="mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(sellingPrice || price)}
            </span>
            
            {discount > 0 && price && (
              <span className="text-xs text-gray-500 line-through">
                {formatPrice(price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
