import axios from "axios";

// API base URL - default to localhost if not set
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Mock data for demo purposes
const MOCK_RESPONSES = {
  "/admin/dashboard-stats": {
    stats: {
      sellersCount: 12,
      productsCount: 86,
      activeProductsCount: 74,
      ordersCount: 130,
      revenue: 45890,
    },
    recentSellers: [
      {
        id: "seller-1",
        shopName: "Fashion Trends",
        ownerName: "John Smith",
        phone: "+91 9876543210",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
      {
        id: "seller-2",
        shopName: "Tech World",
        ownerName: "Arun Kumar",
        phone: "+91 9871234560",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      },
      {
        id: "seller-3",
        shopName: "Home Essentials",
        ownerName: "Priya Sharma",
        phone: "+91 9867890123",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      },
      {
        id: "seller-4",
        shopName: "Kids Corner",
        ownerName: "Rahul Verma",
        phone: "+91 9890123456",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      },
    ],
    recentProducts: [
      {
        id: "product-1",
        name: "Cotton T-Shirt",
        price: 599,
        sellerName: "Fashion Trends",
        isActive: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      {
        id: "product-2",
        name: "Wireless Earbuds",
        price: 1999,
        sellerName: "Tech World",
        isActive: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
      {
        id: "product-3",
        name: "Kitchen Blender",
        price: 1499,
        sellerName: "Home Essentials",
        isActive: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      },
      {
        id: "product-4",
        name: "Educational Toy Set",
        price: 899,
        sellerName: "Kids Corner",
        isActive: true,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      },
    ],
  },
};

/**
 * Creates an authenticated axios instance for admin API requests
 * Uses the admin user from localStorage to attach auth headers
 */
export const getAdminApiClient = () => {
  const adminUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("adminUser") || "{}")
      : {};

  // Create axios instance
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add auth token to requests if available (from localStorage)
  apiClient.interceptors.request.use(
    (config) => {
      // For our simplified auth flow, we'll just create a mock token when the user is authenticated
      if (adminUser.isAuthenticated) {
        // Creating a simple token with "adminId:super-admin-id" and role:superadmin
        // This would match our backend expected format without actually making API calls
        config.headers.Authorization = `Bearer mock-admin-token`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // For demo purposes, intercept specific requests and return mock data
  apiClient.interceptors.request.use(
    async (config) => {
      // Extract the endpoint path from the full URL
      const url = config.url;

      // For GET requests, check if we have mock data
      if (config.method === "get" && MOCK_RESPONSES[url]) {
        // This cancels the actual request
        const mockResponse = MOCK_RESPONSES[url];

        // Return a mock response through a custom adapter
        config.adapter = () => {
          return Promise.resolve({
            data: mockResponse,
            status: 200,
            statusText: "OK",
            headers: {},
            config: config,
          });
        };
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle unauthorized responses
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // If unauthorized (e.g., token expired), redirect to login
      if (error.response && error.response.status === 401) {
        // Clear admin data from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("adminUser");
          // Redirect to login page
          window.location.href = "/admin-login";
        }
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};

export default getAdminApiClient;
