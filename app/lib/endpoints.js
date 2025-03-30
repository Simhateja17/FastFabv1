// Admin API endpoints
export const ADMIN_ENDPOINTS = {
  // User related endpoints
  USERS: "/admin/users",
  USER_DETAIL: (id) => `/admin/users/${id}`,
  USER_ORDERS: (id) => `/admin/users/${id}/orders`,
  BLOCK_USER: (id) => `/admin/users/${id}/block`,
  UNBLOCK_USER: (id) => `/admin/users/${id}/unblock`,

  // Order related endpoints
  ORDERS: "/admin/orders",
  ORDER_DETAIL: (id) => `/admin/orders/${id}`,
  UPDATE_ORDER_STATUS: (id) => `/admin/orders/${id}/status`,

  // Product related endpoints
  PRODUCTS: "/admin/products",
  PRODUCT_DETAIL: (id) => `/admin/products/${id}`,
  APPROVE_PRODUCT: (id) => `/admin/products/${id}/approve`,
  REJECT_PRODUCT: (id) => `/admin/products/${id}/reject`,

  // Seller related endpoints
  SELLERS: "/admin/sellers",
  SELLER_DETAIL: (id) => `/admin/sellers/${id}`,
  SELLER_PRODUCTS: (id) => `/admin/sellers/${id}/products`,
  APPROVE_SELLER: (id) => `/admin/sellers/${id}/approve`,
  REJECT_SELLER: (id) => `/admin/sellers/${id}/reject`,

  // Dashboard endpoints
  DASHBOARD: "/admin/dashboard",
  SALES_STATS: "/admin/dashboard/sales",
  USER_STATS: "/admin/dashboard/users",
  PRODUCT_STATS: "/admin/dashboard/products",

  // Authentication endpoints
  LOGIN: "/admin/login",
  LOGOUT: "/admin/logout",
  PROFILE: "/admin/profile",
};

// User API endpoints
export const USER_ENDPOINTS = {
  // Authentication
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  VERIFY_OTP: "/auth/verify-otp",

  // User profile
  PROFILE: "/user/profile",
  UPDATE_PROFILE: "/user/profile/update",
  ADDRESSES: "/user/addresses",
  ADD_ADDRESS: "/user/addresses",
  UPDATE_ADDRESS: (id) => `/user/addresses/${id}`,
  DELETE_ADDRESS: (id) => `/user/addresses/${id}`,

  // Orders
  ORDERS: "/user/orders",
  ORDER_DETAIL: (id) => `/user/orders/${id}`,
  CANCEL_ORDER: (id) => `/user/orders/${id}/cancel`,

  // Cart
  CART: "/user/cart",
  ADD_TO_CART: "/user/cart",
  UPDATE_CART_ITEM: (id) => `/user/cart/${id}`,
  REMOVE_FROM_CART: (id) => `/user/cart/${id}`,

  // Wishlist
  WISHLIST: "/user/wishlist",
  ADD_TO_WISHLIST: "/user/wishlist",
  REMOVE_FROM_WISHLIST: (id) => `/user/wishlist/${id}`,

  // Products
  PRODUCTS: "/products",
  PRODUCT_DETAIL: (id) => `/products/${id}`,
  PRODUCT_REVIEWS: (id) => `/products/${id}/reviews`,
  ADD_REVIEW: (id) => `/products/${id}/reviews`,

  // Checkout
  CHECKOUT: "/checkout",
  PAYMENT: "/payment",
  VERIFY_PAYMENT: "/payment/verify",
};

// Seller API endpoints
export const SELLER_ENDPOINTS = {
  // Authentication
  REGISTER: "/seller/register",
  LOGIN: "/seller/login",
  LOGOUT: "/seller/logout",

  // Profile
  PROFILE: "/seller/profile",
  UPDATE_PROFILE: "/seller/profile/update",

  // Products
  PRODUCTS: "/seller/products",
  PRODUCT_DETAIL: (id) => `/seller/products/${id}`,
  CREATE_PRODUCT: "/seller/products",
  UPDATE_PRODUCT: (id) => `/seller/products/${id}`,
  DELETE_PRODUCT: (id) => `/seller/products/${id}`,

  // Orders
  ORDERS: "/seller/orders",
  ORDER_DETAIL: (id) => `/seller/orders/${id}`,
  UPDATE_ORDER_STATUS: (id) => `/seller/orders/${id}/status`,

  // Dashboard
  DASHBOARD: "/seller/dashboard",
  SALES_STATS: "/seller/dashboard/sales",
  PRODUCT_STATS: "/seller/dashboard/products",
};
