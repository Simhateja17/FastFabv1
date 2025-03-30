import axios from "axios";

// Get the base URL from environment variables or use a default
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Create a reusable API client for admin endpoints
export const getAdminApiClient = () => {
  // Create a new axios instance
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add request interceptor to include authentication token from localStorage
  apiClient.interceptors.request.use(
    (config) => {
      // Only run on client side
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("adminToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return apiClient;
};

// Regular API client for non-admin endpoints
export const getApiClient = () => {
  // Create a new axios instance
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add request interceptor to include authentication token from localStorage
  apiClient.interceptors.request.use(
    (config) => {
      // Only run on client side
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("userToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return apiClient;
};
