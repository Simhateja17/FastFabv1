// API base URLs with fallbacks
const getBackendServiceUrl = (envVarName, defaultUrl) => {
  const url = process.env[envVarName] || defaultUrl;
  if (typeof window !== 'undefined') {
    console.log(`Using ${envVarName}: ${url}`);
  }
  return url;
};

// API base URL for main app
export const API_URL = getBackendServiceUrl(
  "NEXT_PUBLIC_API_URL", 
  "/api"
);

// API base URL for seller service
export const SELLER_SERVICE_URL = getBackendServiceUrl(
  "NEXT_PUBLIC_SELLER_SERVICE_URL", 
  "http://localhost:8000/api"
);

// Auth endpoints
export const AUTH_ENDPOINTS = {
  SIGNIN: `${API_URL}/auth/signin`,
  SIGNUP: `${API_URL}/auth/signup`,
  REFRESH_TOKEN: `${API_URL}/auth/refresh-token`,
  LOGOUT: `${API_URL}/auth/logout`,
  PROFILE: `${API_URL}/auth/profile`,
  UPDATE_DETAILS: (sellerId) => `${API_URL}/auth/${sellerId}/details`,
};

// User endpoints
export const USER_ENDPOINTS = {
  LOGIN: `/api/user/login`,
  REGISTER: `/api/user/register`,
  REFRESH_TOKEN: `/api/user/refresh-token`,
  LOGOUT: `/api/user/logout`,
  PROFILE: `/api/user/profile`,
  UPDATE_PROFILE: `/api/user/profile`,
  GET_USER_BY_PHONE: `/api/user/phone-login`,
  ADDRESSES: `${API_URL}/address`,
  ADDRESS_DETAIL: (id) => `${API_URL}/address/${id}`,
  LOCATION: `/api/user/location`,
  ADDRESS: `/api/user/address`,
  ORDERS: `${API_URL}/orders`,
  ORDER_DETAIL: (id) => `${API_URL}/orders/${id}`,
  // CART: `${API_URL}/cart`,
  // CART_ITEMS: `${API_URL}/cart/items`,
  WISHLIST: `${API_URL}/wishlist`,
  WISHLIST_ITEM: (id) => `${API_URL}/wishlist/${id}`,
  // WhatsApp OTP Authentication
  PHONE_AUTH_START: `/api/whatsapp-otp/send`,
  PHONE_AUTH_VERIFY: `/api/whatsapp-otp/verify`,
};

// Product endpoints
export const PRODUCT_ENDPOINTS = {
  // Seller service endpoints
  LIST: `${SELLER_SERVICE_URL}/products`,
  DETAIL: (id) => `${SELLER_SERVICE_URL}/products/${id}`,
  CREATE: `${SELLER_SERVICE_URL}/products`,
  UPDATE: (id) => `${SELLER_SERVICE_URL}/products/${id}`,
  DELETE: (id) => `${SELLER_SERVICE_URL}/products/${id}`,
  UPLOAD_IMAGES: `${SELLER_SERVICE_URL}/products/upload-images`,
  COLORS: (id) => `${SELLER_SERVICE_URL}/products/${id}/colors`,
  
  // Public API endpoints
  PUBLIC_ACTIVE: `/api/public/products/active`,
};

// Public endpoints
export const PUBLIC_ENDPOINTS = {
  PRODUCTS: `/api/public/products`,
  ACTIVE_PRODUCTS: `/api/public/products/active`,
  PRODUCT_DETAIL: (id) => `/api/public/products/${id}`,
  PRODUCT_COLORS: (id) => `/api/public/products/${id}/colors`,
};

// Token constants
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60 * 1000, // 15 minutes in milliseconds
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};
