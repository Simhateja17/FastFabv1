"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { API_URL, USER_ENDPOINTS } from "@/app/config";

const UserAuthContext = createContext();

// Token management functions
const setUserTokens = (accessToken, refreshToken) => {
  localStorage.setItem("userAccessToken", accessToken);
  localStorage.setItem("userRefreshToken", refreshToken);
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

  // Refresh the access token using the refresh token
  const refreshAccessToken = async () => {
    try {
      const { refreshToken } = getUserTokens();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(USER_ENDPOINTS.REFRESH_TOKEN, {
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
      setUserTokens(data.accessToken, data.refreshToken);
      setUser(data.user);

      return data.accessToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearUserTokens();
      setUser(null);
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
          // If refresh fails, clear tokens
          clearUserTokens();
          setUser(null);
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
        const { accessToken, refreshToken } = getUserTokens();

        if (!accessToken || !refreshToken) {
          setLoading(false);
          return;
        }

        // Try to get user profile with current token
        const response = await fetch(USER_ENDPOINTS.PROFILE, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else if (response.status === 401) {
          // If unauthorized, try to refresh token
          try {
            await refreshAccessToken();
          } catch (error) {
            clearUserTokens();
            setUser(null);
          }
        } else {
          clearUserTokens();
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearUserTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login user with email and password
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await fetch(USER_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store tokens
      setUserTokens(data.accessToken, data.refreshToken);

      // Store user data
      setUser(data.user);

      // Save user data to localStorage for persistence
      localStorage.setItem("userData", JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (error) {
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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Store tokens if automatically logged in
      if (data.accessToken && data.refreshToken) {
        setUserTokens(data.accessToken, data.refreshToken);
        setUser(data.user);
        localStorage.setItem("userData", JSON.stringify(data.user));
      }

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      const { refreshToken } = getUserTokens();

      if (refreshToken) {
        // Call logout API
        await fetch(USER_ENDPOINTS.LOGOUT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }).catch((error) => console.error("Logout API error:", error));
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear tokens and user state regardless of API success
      clearUserTokens();
      localStorage.removeItem("userData");
      setUser(null);
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

      const updatedUser = await response.json();
      setUser(updatedUser);
      localStorage.setItem("userData", JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
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
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
}

export const useUserAuth = () => useContext(UserAuthContext);
