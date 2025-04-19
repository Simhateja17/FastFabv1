import axios from "axios";

// API base URL - use environment variable or fallback to localhost for development
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Creates an authenticated axios instance for admin API requests
 * Uses the admin token from localStorage to attach auth headers
 */
export const getAdminApiClient = () => {
  // Get admin auth data from localStorage
  let adminToken = "";

  if (typeof window !== "undefined") {
    // Try to get token from different possible localStorage keys
    const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
    const adminAuth = JSON.parse(localStorage.getItem("adminAuth") || "{}");

    // Check all possible token locations
    adminToken =
      adminUser?.token ||
      adminUser?.accessToken ||
      adminAuth?.accessToken ||
      adminAuth?.token ||
      "";

    console.log(
      "Using admin token:",
      adminToken ? "Found token" : "No token found"
    );
  }

  // Create axios instance with baseURL
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Log request details in development
  if (process.env.NODE_ENV === "development") {
    apiClient.interceptors.request.use((request) => {
      console.log(
        "API Request:",
        request.method?.toUpperCase(),
        request.baseURL + request.url
      );
      return request;
    });
  }

  // Add auth token to requests if available
  apiClient.interceptors.request.use(
    (config) => {
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle response errors (like unauthorized)
  apiClient.interceptors.response.use(
    (response) => {
      if (process.env.NODE_ENV === "development") {
        console.log("API Response:", response.status, response.config.url);
      }
      return response;
    },
    (error) => {
      // Log errors in development
      if (process.env.NODE_ENV === "development") {
        console.error(
          "API Error:",
          error.response?.status || "Network Error",
          error.config?.url,
          error.response?.data || error.message
        );
      }

      // If unauthorized (token expired), redirect to login
      if (error.response && error.response.status === 401) {
        // Clear admin data from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("adminUser");
          localStorage.removeItem("adminAuth");
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
