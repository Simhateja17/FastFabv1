"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { API_URL, AUTH_ENDPOINTS, TOKEN_EXPIRY } from "@/app/config";

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

  // Check for token on initial load
  useEffect(() => {
    let isMounted = true;
    let authCheckCompleted = false;

    const initializeAuth = async () => {
      if (authCheckCompleted) return;

      try {
        const { accessToken, refreshToken } = getTokens();

        if (!accessToken || !refreshToken) {
          if (isMounted) setLoading(false);
          return;
        }

        // Try to get user profile with current access token
        try {
          const response = await fetch(AUTH_ENDPOINTS.PROFILE, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (isMounted) setSeller(data.seller);
          } else if (response.status === 401) {
            // If token is invalid, try to refresh
            try {
              await refreshAccessToken();
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              clearTokens();
              if (isMounted) setSeller(null);
            }
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          clearTokens();
          if (isMounted) setSeller(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        authCheckCompleted = true;
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

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

      // Store tokens
      setTokens(data.accessToken, data.refreshToken);
      setSeller(data.seller);

      return { success: true, seller: data.seller };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

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

      // Store tokens
      setTokens(data.accessToken, data.refreshToken);

      // Set seller state with the available data
      // Mark as needsOnboarding: true to ensure redirection to onboarding
      setSeller({
        id: data.sellerId,
        phone: phone,
        needsOnboarding: true,
        // Other fields will be null until onboarding
      });

      return { success: true, sellerId: data.sellerId, needsOnboarding: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateSellerDetails = async (sellerId, details) => {
    try {
      setLoading(true);

      const response = await authFetch(
        AUTH_ENDPOINTS.UPDATE_DETAILS(sellerId),
        {
          method: "PATCH",
          body: JSON.stringify(details),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update seller details");
      }

      // Update seller state and mark as onboarded
      const updatedSeller = {
        ...data.seller,
        needsOnboarding: false,
      };
      setSeller(updatedSeller);

      return { success: true, seller: updatedSeller };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { refreshToken } = getTokens();

      if (refreshToken) {
        // Attempt to invalidate the refresh token on the server
        await authFetch(AUTH_ENDPOINTS.LOGOUT, {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        }).catch(console.error); // Don't block logout if server request fails
      }
    } finally {
      // Always clear local tokens and state
      clearTokens();
      setSeller(null);
    }
  };

  const checkAuth = async () => {
    try {
      const { accessToken } = getTokens();
      if (!accessToken) {
        return false;
      }

      const response = await authFetch(AUTH_ENDPOINTS.PROFILE);

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      const data = await response.json();
      setSeller(data.seller);
      return true;
    } catch (error) {
      console.error("Authentication error:", error);
      clearTokens();
      setSeller(null);
      return false;
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
        checkAuth,
        updateSellerDetails,
        authFetch,
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
