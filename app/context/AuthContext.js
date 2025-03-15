"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { API_URL, AUTH_ENDPOINTS, TOKEN_EXPIRY } from "@/app/config";

const AuthContext = createContext();

// Token management functions
const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  // Set a timestamp for when the profile was last checked
  localStorage.setItem("lastProfileCheck", Date.now().toString());
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
  localStorage.removeItem("lastProfileCheck");
};

// Global variable to prevent multiple auth checks across renders
let isGlobalAuthCheckInProgress = false;

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

    const initializeAuth = async () => {
      // Prevent multiple auth checks globally across renders
      if (isGlobalAuthCheckInProgress) {
        console.log("Auth check already in progress, skipping");
        return;
      }

      // Check if we've recently checked the profile (within the last 30 seconds)
      const lastCheck = localStorage.getItem("lastProfileCheck");
      const now = Date.now();
      if (lastCheck && now - parseInt(lastCheck) < 30000) {
        console.log("Profile recently checked, using cached data");

        // Use cached seller data if available
        const storedSellerData = localStorage.getItem("sellerData");
        if (storedSellerData && isMounted) {
          try {
            const parsedSellerData = JSON.parse(storedSellerData);
            console.log("Using cached seller data:", parsedSellerData);
            setSeller(parsedSellerData);
          } catch (e) {
            console.error("Error parsing stored seller data:", e);
          }
        }

        setLoading(false);
        return;
      }

      isGlobalAuthCheckInProgress = true;

      try {
        console.log("Initializing auth...");
        const { accessToken, refreshToken } = getTokens();

        // Check for backup seller data in localStorage
        const storedSellerData = localStorage.getItem("sellerData");
        if (storedSellerData && isMounted) {
          try {
            const parsedSellerData = JSON.parse(storedSellerData);
            console.log("Found stored seller data:", parsedSellerData);
            setSeller(parsedSellerData);
          } catch (e) {
            console.error("Error parsing stored seller data:", e);
          }
        }

        if (!accessToken || !refreshToken) {
          console.log("No tokens found");
          if (isMounted) setLoading(false);
          return;
        }

        // Try to get user profile with current access token
        try {
          console.log("Fetching profile with token");
          const response = await fetch(AUTH_ENDPOINTS.PROFILE, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          console.log("Profile response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("Profile data:", data);
            if (isMounted) {
              // Check for new registration flag
              const isNewRegistration =
                localStorage.getItem("isNewRegistration") === "true";

              // Preserve needsOnboarding flag if it exists in current state or if this is a new registration
              const currentSeller = seller || {};
              const updatedSeller = {
                ...data.seller,
                needsOnboarding: isNewRegistration
                  ? true
                  : data.seller.shopName
                  ? false
                  : currentSeller.needsOnboarding || true,
              };

              console.log("Setting seller state to:", updatedSeller);
              setSeller(updatedSeller);

              // Update backup
              localStorage.setItem("sellerData", JSON.stringify(updatedSeller));
              // Update last check timestamp
              localStorage.setItem("lastProfileCheck", now.toString());
            }
          } else if (response.status === 401) {
            // If token is invalid, try to refresh
            try {
              console.log("Attempting to refresh token");
              await refreshAccessToken();
              // Update last check timestamp
              localStorage.setItem("lastProfileCheck", now.toString());
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              clearTokens();
              localStorage.removeItem("sellerData");
              if (isMounted) setSeller(null);
            }
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          clearTokens();
          localStorage.removeItem("sellerData");
          if (isMounted) setSeller(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        isGlobalAuthCheckInProgress = false;
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
      console.log("Starting login process for:", phone);

      const response = await fetch(AUTH_ENDPOINTS.SIGNIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();
      console.log("Login API response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store tokens
      setTokens(data.accessToken, data.refreshToken);

      // Determine if seller needs onboarding based on shopName
      const needsOnboarding = !data.seller.shopName;
      const sellerData = {
        ...data.seller,
        needsOnboarding,
      };

      console.log("Setting seller state to:", sellerData);
      setSeller(sellerData);

      // Also store in localStorage as a backup
      localStorage.setItem("sellerData", JSON.stringify(sellerData));

      // Set a timestamp for when the profile was last checked to prevent immediate profile checks
      localStorage.setItem("lastProfileCheck", Date.now().toString());

      // Clear any new registration flag
      localStorage.removeItem("isNewRegistration");

      return { success: true, seller: sellerData };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (phone, password) => {
    try {
      setLoading(true);
      console.log("Starting registration process for:", phone);

      const response = await fetch(AUTH_ENDPOINTS.SIGNUP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();
      console.log("Registration API response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Store tokens
      setTokens(data.accessToken, data.refreshToken);

      // Set seller state with the available data
      // IMPORTANT: Force needsOnboarding to true for new registrations
      const sellerData = {
        id: data.sellerId,
        phone: phone,
        needsOnboarding: true, // Always true for new registrations
        // Other fields will be null until onboarding
      };

      console.log("Setting seller state to:", sellerData);
      setSeller(sellerData);

      // Also store in localStorage as a backup
      localStorage.setItem("sellerData", JSON.stringify(sellerData));

      // Set a timestamp for when the profile was last checked to prevent immediate profile checks
      localStorage.setItem("lastProfileCheck", Date.now().toString());

      // Set a flag to indicate this is a new registration
      localStorage.setItem("isNewRegistration", "true");

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
      console.log("Logging out...");
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
      console.log("Clearing auth state");
      clearTokens();
      localStorage.removeItem("sellerData");
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
