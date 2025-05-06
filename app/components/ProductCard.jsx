"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { useCartStore } from '../lib/cartStore';
import { useWishlistStore } from '../lib/wishlistStore';
import { useRouter } from 'next/navigation';

export default function ProductCard({ product }) {
  // --- ALL hooks called unconditionally at the top level ---
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addItem);
  const addToWishlist = useWishlistStore((state) => state.addItem);
  const isInWishlist = useWishlistStore((state) => 
    product && product.id ? state.isInWishlist(product.id) : false
  );

  // Declare all variables needed for hooks, with safe fallbacks
  const productId = product?.id || 'unknown-id';
  const productName = product?.name || 'Unnamed Product';
  const productMrpPrice = product?.mrpPrice || 0;
  const productSellingPrice = product?.sellingPrice || 0;
  const productDiscountPercentage = product?.discountPercentage;
  const productImageUrl = product?.imageUrl;
  const productCategory = product?.category || 'General';
  const productImages = Array.isArray(product?.images) ? product.images : [];
  const productIsOutOfStock = product?.isOutOfStock || false;
  
  // Safe images array
  const safeImages = Array.isArray(productImages) ? productImages : [];
  
  // Calculate final image URL
  const finalImageUrl = safeImages.length > 0 
    ? safeImages[0] 
    : productImageUrl || 'https://via.placeholder.com/300';

  // Debug logs in useEffect - all these hooks are called unconditionally
  useEffect(() => {
    if (!product || typeof product !== 'object') {
      console.error('ProductCard effect: received invalid product prop');
      return;
    }
    
    if (!product.id) {
      console.error('ProductCard effect: received product without ID:', product);
      return;
    }
    
    // Log all critical missing fields
    const missingFields = [];
    if (!product.name) missingFields.push('name');
    if (!product.images && !product.imageUrl) missingFields.push('images/imageUrl');
    if (product.sellingPrice === undefined && product.mrpPrice === undefined) missingFields.push('price');
    
    if (missingFields.length > 0) {
      console.warn(`ProductCard effect for ID ${product.id} missing fields:`, missingFields);
      console.log('Product data:', product);
    } else {
      console.log(`ProductCard effect for ID ${product.id} initialized successfully`);
    }
  }, [product]);

  // Image URL check effect
  useEffect(() => {
    if (productId !== 'unknown-id' && finalImageUrl === 'https://via.placeholder.com/300') {
      console.warn(`Using placeholder image for product ${productId} - No valid image found`, { 
        hasImages: safeImages.length > 0, 
        imageUrlProvided: !!productImageUrl 
      });
    }
  }, [finalImageUrl, productId, productImageUrl, safeImages.length]);

  // Format price function is memoized
  const formatPrice = useCallback((price) => {
    const validPrice = Number(price) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(validPrice);
  }, []);

  // Calculate discount percentage
  const discount = useMemo(() => 
    productDiscountPercentage || (productMrpPrice && productSellingPrice && productMrpPrice > productSellingPrice
      ? Math.round(100 - ((productSellingPrice / productMrpPrice) * 100))
      : 0), 
    [productDiscountPercentage, productMrpPrice, productSellingPrice]
  );

  // Cart handler
  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (productIsOutOfStock) return;
    
    addToCart({
      id: productId,
      name: productName,
      price: productSellingPrice || productMrpPrice,
      mrpPrice: productMrpPrice,
      image: finalImageUrl,
      quantity: 1,
      size: 'M'
    });
  }, [addToCart, finalImageUrl, productId, productIsOutOfStock, productMrpPrice, productName, productSellingPrice]);

  // Wishlist handler
  const handleAddToWishlist = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToWishlist({
      id: productId,
      name: productName,
      price: productSellingPrice || productMrpPrice,
      image: finalImageUrl,
    });
  }, [addToWishlist, finalImageUrl, productId, productMrpPrice, productName, productSellingPrice]);

  // --- After all hooks, we can have conditional returns ---
  if (!product || typeof product !== 'object' || !product.id) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 h-80 animate-pulse">
        <div className="bg-gray-200 h-48 rounded-md mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  // --- Render component with pre-calculated values ---
  // DEBUGGING LOGS REMOVED
  // if (product && product.name && product.name.toLowerCase().includes('armor men track pant')) { 
  //   console.log('ProductCard received product (Armor Men Track Pant):', JSON.parse(JSON.stringify(product)));
  //   console.log('ProductCard images (Armor Men Track Pant):', product?.images);
  //   console.log('ProductCard imageUrl (Armor Men Track Pant):', product?.imageUrl);
  //   console.log('ProductCard finalImageUrl (Armor Men Track Pant):', finalImageUrl);
  // }

  return (
    <Link
      href={`/products/${productId}`}
      className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <div className="relative w-full h-full">
          {finalImageUrl ? (
            <Image
              src={finalImageUrl}
              alt={productName || 'Product image'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover object-center"
              onError={(e) => {
                console.log(`Image load error for product ${productId}:`, e);
                e.currentTarget.src = '/placeholder-product.jpg';
              }}
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-sm text-gray-500">No image available</span>
            </div>
          )}
        </div>

        {/* Out of stock overlay */}
        {productIsOutOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium text-lg">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product details */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
          {productName}
        </h3>
        
        <p className="text-xs text-gray-500 mb-2">
          {productCategory}
        </p>
        
        <div className="mt-auto">
          <div className="flex flex-col">
            {discount > 0 && productMrpPrice && (
              <div className="mb-1">
                <span className="text-xs font-bold text-gray-700 relative">
                  <span>MRP: {formatPrice(productMrpPrice)}</span>
                  <span className="absolute inset-x-0 top-1/2 h-[1.5px] bg-red-500 -translate-y-1/2"></span>
                </span>
              </div>
            )}
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-base font-bold text-gray-900">
                {formatPrice(productSellingPrice || productMrpPrice)}
              </span>
              {discount > 0 && (
                <>
                  <div className="bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-md transform -rotate-2 shadow-sm">
                    <span className="text-xs flex items-center justify-center">
                      <span className="text-yellow-300">{discount}%</span>
                      <span className="ml-0.5">OFF</span>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-red-600 w-full mt-1">
                    Save {formatPrice(productMrpPrice - productSellingPrice)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
