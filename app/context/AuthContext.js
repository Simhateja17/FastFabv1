"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { API_URL, AUTH_ENDPOINTS } from "@/app/config";

const AuthContext = createContext();

// Token management functions
const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

const getTokens = () => {
  if (typeof window === "undefined")
    return { accessToken: null, refreshToken: null };

  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
  };
};

const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export function AuthProvider({ children }) {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh the access token using the refresh token
  const refreshAccessToken = async () => {
    try {
      const { refreshToken } = getTokens();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(AUTH_ENDPOINTS.REFRESH_TOKEN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      setSeller(data.seller);

      return data.accessToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearTokens();
      setSeller(null);
      throw error;
    }
  };

  // Create an authenticated fetch function that handles token refresh
  const authFetch = async (url, options = {}) => {
    const { accessToken } = getTokens();

    // Set up headers with access token
    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      // First attempt with current access token
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401) {
        try {
          // Try to refresh the token
          const newAccessToken = await refreshAccessToken();

          // Retry the request with the new token
          return fetch(url, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
          });
        } catch (refreshError) {
          // If refresh fails, clear auth state and throw error
          clearTokens();
          setSeller(null);
          throw refreshError;
        }
      }

      return response;
    } catch (error) {
      console.error("Auth fetch error:", error);
      throw error;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { accessToken, refreshToken } = getTokens();

        if (!accessToken || !refreshToken) {
          setLoading(false);
          return;
        }

        // Try to get seller profile with current token
        const response = await fetch(AUTH_ENDPOINTS.PROFILE, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSeller(data);
        } else if (response.status === 401) {
          // If unauthorized, try to refresh token
          try {
            await refreshAccessToken();
          } catch (error) {
            clearTokens();
            setSeller(null);
          }
        } else {
          clearTokens();
          setSeller(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearTokens();
        setSeller(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (phone, password) => {
    try {
      setLoading(true);
      const response = await fetch(AUTH_ENDPOINTS.SIGNIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      setTokens(data.accessToken, data.refreshToken);
      setSeller(data.seller);
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (phone, password) => {
    try {
      setLoading(true);
      const response = await fetch(AUTH_ENDPOINTS.SIGNUP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setTokens(data.accessToken, data.refreshToken);
      setSeller(data.seller);
      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authFetch(AUTH_ENDPOINTS.LOGOUT, { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearTokens();
      setSeller(null);
    }
  };

  // Update seller details
  const updateSellerDetails = async (sellerId, details) => {
    try {
      const response = await authFetch(AUTH_ENDPOINTS.UPDATE_DETAILS(sellerId), {
        method: "PUT",
        body: JSON.stringify(details),
      });

      if (!response.ok) {
        throw new Error("Failed to update seller details");
      }

      const updatedSeller = await response.json();
      setSeller(updatedSeller);
      return updatedSeller;
    } catch (error) {
      console.error("Error updating seller details:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        seller,
        loading,
        login,
        register,
        logout,
        updateSellerDetails,
        authFetch,
        setSeller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
