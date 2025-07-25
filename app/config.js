/**
 * Barrel file for configuration exports
 * 
 * This file re-exports everything from the config/index.js file,
 * providing a cleaner import structure and better maintainability.
 * All components should import from '@/app/config' instead of '@/app/config/index'.
 */

export * from '@/app/config/index';

export const PRODUCT_ENDPOINTS = {
    // Use the seller service URL for image uploads
    UPLOAD_IMAGES: `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products/upload-images`,
    CREATE: `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products`,
    // Ensure DETAIL is defined as a function that takes an ID
    DETAIL: (id) => `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products/${id}`,
    UPDATE: (id) => `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products/${id}`,
    // Add COLORS function for fetching color inventory
    COLORS: (id) => `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products/${id}/colors`,
    // ... other endpoints
}; 