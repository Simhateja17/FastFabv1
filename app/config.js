export const PRODUCT_ENDPOINTS = {
    // Use the seller service URL for image uploads
    UPLOAD_IMAGES: `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products/upload-images`,
    CREATE: `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products`,
    // ... other endpoints
}; 