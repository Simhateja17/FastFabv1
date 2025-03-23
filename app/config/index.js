// API base URL
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  LOGIN: `${API_URL}/user/login`,
  REGISTER: `${API_URL}/user/register`,
  REFRESH_TOKEN: `${API_URL}/user/refresh-token`,
  LOGOUT: `${API_URL}/user/logout`,
  PROFILE: `${API_URL}/user/profile`,
  UPDATE_PROFILE: `${API_URL}/user/profile`,
  ADDRESSES: `${API_URL}/address`,
  ADDRESS_DETAIL: (id) => `${API_URL}/address/${id}`,
  ORDERS: `${API_URL}/orders`,
  ORDER_DETAIL: (id) => `${API_URL}/orders/${id}`,
  CART: `${API_URL}/cart`,
  CART_ITEMS: `${API_URL}/cart/items`,
  WISHLIST: `${API_URL}/wishlist`,
  WISHLIST_ITEM: (id) => `${API_URL}/wishlist/${id}`,
};

// Product endpoints
export const PRODUCT_ENDPOINTS = {
  LIST: `${API_URL}/api/products`,
  DETAIL: (id) => `${API_URL}/api/products/${id}`,
  CREATE: `${API_URL}/api/products`,
  UPDATE: (id) => `${API_URL}/api/products/${id}`,
  DELETE: (id) => `${API_URL}/api/products/${id}`,
  UPLOAD_IMAGES: `${API_URL}/api/products/upload-images`,
  PUBLIC_ACTIVE: `${API_URL}/api/products/all`,
};

// Public endpoints
export const PUBLIC_ENDPOINTS = {
  PRODUCTS: `${API_URL}/public/products`,
  ACTIVE_PRODUCTS: `${API_URL}/public/products/active`,
  PRODUCT_DETAIL: (id) => `${API_URL}/public/products/${id}`,
  PRODUCT_COLORS: (id) => `${API_URL}/public/products/${id}/colors`,
};

// Token constants
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60 * 1000, // 15 minutes in milliseconds
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};
