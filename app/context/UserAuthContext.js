"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { API_URL, USER_ENDPOINTS } from "@/app/config";

const UserAuthContext = createContext();

// Token management functions
const setUserTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem("userAccessToken", accessToken);
  if (refreshToken) localStorage.setItem("userRefreshToken", refreshToken);

  // Debug log
  console.log("Tokens saved:", {
    accessToken: accessToken ? "Present" : "Missing",
    refreshToken: refreshToken ? "Present" : "Missing",
  });
};

const getUserTokens = () => {
  if (typeof window === "undefined")
    return { accessToken: null, refreshToken: null };

  return {
    accessToken: localStorage.getItem("userAccessToken"),
    refreshToken: localStorage.getItem("userRefreshToken"),
  };
};

const clearUserTokens = () => {
  localStorage.removeItem("userAccessToken");
  localStorage.removeItem("userRefreshToken");
};

export function UserAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStateChange, setAuthStateChange] = useState(0);

  // Helper to update both user state and trigger state change
  const updateUserState = (userData) => {
    console.log("Updating user state to:", userData);
    setUser(userData);
    // Increment to force context consumers to re-render
    setAuthStateChange((prev) => prev + 1);
  };

  // Refresh the access token using the refresh token
  const refreshAccessToken = async () => {
    try {
      const { refreshToken } = getUserTokens();
      console.log(
        "Attempting to refresh token with:",
        refreshToken ? "Valid refresh token" : "No refresh token"
      );

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(USER_ENDPOINTS.REFRESH_TOKEN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        credentials: "include", // Include cookies
      });

      if (!response.ok) {
        console.error(
          "Token refresh failed:",
          response.status,
          response.statusText
        );
        throw new Error("Failed to refresh token");
      }

      const result = await response.json();
      console.log("Token refresh response structure:", Object.keys(result));

      // Extract token data more carefully with fallbacks
      let newAccessToken = null;
      let newRefreshToken = null;
      let userData = null;

      // Try to extract from different possible response structures
      if (result.accessToken && result.refreshToken) {
        newAccessToken = result.accessToken;
        newRefreshToken = result.refreshToken;
      } else if (result.tokens) {
        newAccessToken = result.tokens.accessToken;
        newRefreshToken = result.tokens.refreshToken;
      } else if (result.data?.tokens) {
        newAccessToken = result.data.tokens.accessToken;
        newRefreshToken = result.data.tokens.refreshToken;
      } else if (result.data?.accessToken) {
        newAccessToken = result.data.accessToken;
        newRefreshToken = result.data.refreshToken;
      }

      // Extract user data if present
      userData = result.user || result.data?.user;

      if (!newAccessToken || !newRefreshToken) {
        console.error("Invalid token refresh response format:", result);
        throw new Error("Invalid token refresh response format");
      }

      console.log("Token refresh successful, new tokens received");
      setUserTokens(newAccessToken, newRefreshToken);

      if (userData) {
        updateUserState(userData);
        localStorage.setItem("userData", JSON.stringify(userData));
        console.log("User state updated after token refresh:", userData);
      }

      return newAccessToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearUserTokens();
      updateUserState(null);
      localStorage.removeItem("userData");
      throw error;
    }
  };

  // Create an authenticated fetch function that handles token refresh
  const userAuthFetch = async (url, options = {}) => {
    const { accessToken } = getUserTokens();

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
        credentials: "include", // Include cookies in all requests
      });

      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401) {
        try {
          // Try to refresh the token
          const newAccessToken = await refreshAccessToken();
          console.log("Retrying request with new access token");

          // Retry the request with the new token
          return fetch(url, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
            credentials: "include",
          });
        } catch (refreshError) {
          // If refresh fails, clear tokens
          console.error(
            "Token refresh failed, clearing auth state:",
            refreshError
          );
          clearUserTokens();
          updateUserState(null);
          localStorage.removeItem("userData");
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
      console.log("Initializing auth state...");
      try {
        const { accessToken, refreshToken } = getUserTokens();
        console.log("Tokens from storage:", {
          accessToken: accessToken ? "Present" : "Missing",
          refreshToken: refreshToken ? "Present" : "Missing",
        });

        // Try to get persisted user data from localStorage
        const savedUserData = localStorage.getItem("userData");
        console.log("Saved user data exists:", !!savedUserData);

        if (!accessToken && !refreshToken) {
          console.log("No tokens found, user is not authenticated");

          // Even with no tokens, if there's saved user data, we'll use it temporarily
          // This helps prevent UI flicker until we can verify auth status
          if (savedUserData) {
            try {
              const parsedUserData = JSON.parse(savedUserData);
              console.log("Using saved user data temporarily:", parsedUserData);
              updateUserState(parsedUserData);
            } catch (e) {
              console.error("Error parsing saved user data:", e);
              localStorage.removeItem("userData");
            }
          }

          setLoading(false);
          return;
        }

        // Set user data from localStorage while we verify the token
        if (savedUserData) {
          try {
            const parsedUserData = JSON.parse(savedUserData);
            console.log("Setting user from localStorage:", parsedUserData);
            updateUserState(parsedUserData);
          } catch (e) {
            console.error("Error parsing saved user data:", e);
            localStorage.removeItem("userData");
          }
        }

        // If we have no access token but have a refresh token, try to refresh
        if (!accessToken && refreshToken) {
          console.log(
            "Missing access token but have refresh token - attempting refresh"
          );
          try {
            await refreshAccessToken();
            console.log("Successfully refreshed token during initialization");
            setLoading(false);
            return;
          } catch (error) {
            console.error("Token refresh failed during initialization:", error);
            clearUserTokens();
            updateUserState(null);
            localStorage.removeItem("userData");
            setLoading(false);
            return;
          }
        }

        // Try to get user profile with current token
        console.log("Attempting to fetch user profile with current token");
        const response = await fetch(USER_ENDPOINTS.PROFILE, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          console.log("Profile fetch successful:", userData);

          // Extract user data from various possible response structures
          const user =
            userData.user || userData.data?.user || userData.data || userData;

          updateUserState(user);
          localStorage.setItem("userData", JSON.stringify(user));
        } else if (response.status === 401) {
          console.log("Token expired, attempting to refresh");
          // If unauthorized, try to refresh token
          try {
            await refreshAccessToken();
            console.log("Token refresh successful during initialization");
          } catch (error) {
            console.error("Token refresh failed during initialization:", error);
            clearUserTokens();
            updateUserState(null);
            localStorage.removeItem("userData");
          }
        } else {
          console.error("Profile fetch failed with status:", response.status);
          clearUserTokens();
          updateUserState(null);
          localStorage.removeItem("userData");
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearUserTokens();
        updateUserState(null);
        localStorage.removeItem("userData");
      } finally {
        console.log("Auth initialization complete, user state:", user);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login user with email and password
  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log("Login attempt for:", email);
      const response = await fetch(USER_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Include cookies
      });

      const data = await response.json();
      console.log("Login response structure:", Object.keys(data));

      if (!response.ok) {
        console.error("Login failed:", data);
        throw new Error(data.message || "Login failed");
      }

      // Extract tokens carefully with multiple fallbacks
      let accessToken = null;
      let refreshToken = null;
      let userData = null;

      // Try to extract tokens from different possible response structures
      if (data.accessToken && data.refreshToken) {
        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
      } else if (data.tokens) {
        accessToken = data.tokens.accessToken;
        refreshToken = data.tokens.refreshToken;
      } else if (data.data?.tokens) {
        accessToken = data.data.tokens.accessToken;
        refreshToken = data.data.tokens.refreshToken;
      } else if (data.data?.accessToken) {
        accessToken = data.data.accessToken;
        refreshToken = data.data.refreshToken;
      }

      // Try to extract user data from different possible response structures
      userData = data.user || data.data?.user || data.data;

      if (!userData) {
        console.error("No user data found in response");
        throw new Error("Invalid response format");
      }

      if (!accessToken || !refreshToken) {
        console.error("No tokens found in response:", data);
        throw new Error("Missing authentication tokens");
      }

      // Store tokens
      setUserTokens(accessToken, refreshToken);
      console.log("Tokens stored successfully");

      // Store user data - use the new function
      updateUserState(userData);
      console.log("User state updated:", userData);

      // Save user data to localStorage for persistence
      localStorage.setItem("userData", JSON.stringify(userData));
      console.log("User data saved to localStorage");

      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await fetch(USER_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include", // Include cookies
      });

      const result = await response.json();
      console.log("Registration response structure:", Object.keys(result));

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      // Extract data with multiple fallbacks to handle different response formats
      let accessToken = null;
      let refreshToken = null;
      let user = null;

      // Try to extract tokens from different possible structures
      if (result.accessToken && result.refreshToken) {
        accessToken = result.accessToken;
        refreshToken = result.refreshToken;
      } else if (result.tokens) {
        accessToken = result.tokens.accessToken;
        refreshToken = result.tokens.refreshToken;
      } else if (result.data?.tokens) {
        accessToken = result.data.tokens.accessToken;
        refreshToken = result.data.tokens.refreshToken;
      }

      // Try to extract user from different possible structures
      user = result.user || result.data?.user || result.data;

      // Store tokens if automatically logged in
      if (accessToken && refreshToken) {
        setUserTokens(accessToken, refreshToken);
        updateUserState(user);
        localStorage.setItem("userData", JSON.stringify(user));
      }

      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      console.log("Logging out user");
      const { refreshToken } = getUserTokens();
      console.log("Refresh token available for logout:", !!refreshToken);

      if (refreshToken) {
        // Call logout API
        await fetch(USER_ENDPOINTS.LOGOUT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
          credentials: "include", // Include cookies
        }).catch((error) => console.error("Logout API error:", error));
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear tokens and user state regardless of API success
      clearUserTokens();
      localStorage.removeItem("userData");
      updateUserState(null); // Use the new function
      console.log("User logged out, state cleared");
    }
  };

  // Update user profile
  const updateUserProfile = async (userData) => {
    try {
      const response = await userAuthFetch(USER_ENDPOINTS.UPDATE_PROFILE, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      const result = await response.json();
      console.log("Profile update response:", result);

      // Extract user data handling both response formats
      const updatedUserData =
        result.data?.user || result.data || result.user || result;

      updateUserState(updatedUserData);
      localStorage.setItem("userData", JSON.stringify(updatedUserData));

      return { success: true, user: updatedUserData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
    userAuthFetch,
    authStateChange, // Expose the state change counter
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
}

export const useUserAuth = () => useContext(UserAuthContext);
