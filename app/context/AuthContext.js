"use client";

import { createContext, useContext, useState, useEffect } from "react";


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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status >= 500) {
          // Server error - don't clear tokens on server issues
          console.warn("Server error during token refresh");
          // Return the existing access token to prevent immediate logout
          return getTokens().accessToken;
        }

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 401) {
            // Token invalid or expired
            throw new Error("Invalid refresh token");
          } else {
            // Other client errors
            throw new Error(`Failed to refresh token: ${response.status}`);
          }
        }

        const data = await response.json();
        setTokens(data.accessToken, data.refreshToken);
        setSeller(data.seller);

        return data.accessToken;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Network errors (abort, network failure) shouldn't clear auth state
        if (fetchError.name === 'AbortError' || fetchError instanceof TypeError) {
          console.warn("Network issue during token refresh:", fetchError.message);
          // Return existing token to maintain session during network issues
          return getTokens().accessToken;
        }
        
        throw fetchError; // Re-throw other errors
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      
      // Only clear auth on specific error conditions that indicate invalid authentication
      if (
        error.message === "No refresh token available" || 
        error.message === "Invalid refresh token"
      ) {
        clearTokens();
        setSeller(null);
      }
      
      throw error;
    }
  };

  // Create an authenticated fetch function that handles token refresh
  const authFetch = async (url, options = {}) => {
    const { accessToken } = getTokens();

    // Set up headers with access token
    const headers = {
      ...options.headers,
    };

    // Only add Content-Type: application/json if we're not sending FormData
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const makeRequest = async (token = accessToken, retryCount = 0) => {
      try {
        const requestHeaders = { ...headers };
        if (token) {
          requestHeaders.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
          ...options,
          headers: requestHeaders,
          signal: controller.signal
        });

        // If unauthorized and we have a refresh token, try to refresh
        if (response.status === 401 && retryCount === 0) {
          try {
            // Try to refresh the token
            const newAccessToken = await refreshAccessToken();
            
            // Retry the request with the new token
            return makeRequest(newAccessToken, retryCount + 1);
          } catch (refreshError) {
            // Only clear auth state for specific auth errors, not network issues
            if (refreshError.message.includes("Invalid refresh token") || 
                refreshError.message === "No refresh token available") {
              clearTokens();
              setSeller(null);
            }
            throw refreshError;
          }
        }
        
        // For server errors, retry once after a short delay
        if (response.status >= 500 && retryCount === 0) {
          console.warn(`Server error ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return makeRequest(token, retryCount + 1);
        }

        return response;
      } catch (error) {
        // For network errors, retry once
        if ((error.name === 'AbortError' || error instanceof TypeError) && retryCount === 0) {
          console.warn(`Network error: ${error.message}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return makeRequest(token, retryCount + 1);
        }
        throw error;
      }
    };

    try {
      const response = await makeRequest();
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
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
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const sellerData = await response.json();
            setSeller(sellerData); // Direct seller data, not nested in a 'seller' property
          } else if (response.status === 401) {
            // If unauthorized, try to refresh token
            try {
              await refreshAccessToken();
            } catch (refreshError) {
              console.error("Token refresh failed during init:", refreshError);
              // Don't clear tokens immediately on a single refresh failure
              // This prevents logout on network issues or temporary server problems
              if (refreshError.message === "No refresh token available") {
                clearTokens();
                setSeller(null);
              }
            }
          } else if (response.status >= 500) {
            // Server error - don't log out the user, just set loading to false
            console.warn("Server error during auth initialization, maintaining current state");
            // Keep existing tokens, don't clear auth state on server errors
          } else {
            // Other client errors (400, 403, etc)
            console.error(`Unexpected auth response: ${response.status}`);
            clearTokens();
            setSeller(null);
          }
        } catch (fetchError) {
          // Network error or other fetch failure
          console.error("Auth profile fetch failed:", fetchError);
          // Don't clear tokens on network errors to prevent logout on temporary issues
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        // Only clear tokens for critical errors, not network issues
        if (!(error instanceof TypeError)) {
          clearTokens();
          setSeller(null);
        }
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        setSeller(data.seller);
        return { success: true, seller: data.seller };
      } else {
        console.error('Missing tokens in login response');
        return { success: false, error: 'Invalid server response' };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message || 'Something went wrong' };
    } finally {
      setLoading(false);
    }
  };

  // Login with OTP function
  const loginWithOTP = async (phone) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      console.log('OTP Login response:', data);

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        setSeller(data.seller);
        return { success: true, seller: data.seller };
      } else {
        console.error('Missing tokens in login response');
        return { success: false, error: 'Invalid server response' };
      }
    } catch (error) {
      console.error("OTP Login error:", error);
      return { success: false, error: error.message || 'Something went wrong' };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (phone, password) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
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

  // Register with OTP function
  const registerWithOTP = async (phone) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || "Registration failed" 
        };
      }

      setTokens(data.accessToken, data.refreshToken);
      setSeller(data.seller);
      return { 
        success: true, 
        accessToken: data.accessToken, 
        seller: data.seller 
      };
    } catch (error) {
      console.error("OTP Registration error:", error);
      return { 
        success: false, 
        error: error.message || 'Something went wrong' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, { method: "POST" });
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
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/${sellerId}/details`, {
        method: "PATCH",
        body: JSON.stringify(details),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update seller details");
      }

      const data = await response.json();
      setSeller(data.seller);
      return { success: true, seller: data.seller };
    } catch (error) {
      console.error("Error updating seller details:", error);
      return { success: false, error: error.message };
    }
  };

  // Login with OTP function
  const loginWithOTP = async (phone) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/auth/signin-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      console.log('OTP Login response:', data);

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
        setSeller(data.seller);
        return { success: true, seller: data.seller };
      } else {
        console.error('Missing tokens in login response');
        return { success: false, error: 'Invalid server response' };
      }
    } catch (error) {
      console.error("OTP Login error:", error);
      return { success: false, error: error.message || 'Something went wrong' };
    } finally {
      setLoading(false);
    }
  };

  // Register with OTP function
  const registerWithOTP = async (phone) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/auth/signup-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || "Registration failed" 
        };
      }

      setTokens(data.accessToken, data.refreshToken);
      setSeller(data.seller);
      return { 
        success: true, 
        accessToken: data.accessToken, 
        seller: data.seller 
      };
    } catch (error) {
      console.error("OTP Registration error:", error);
      return { 
        success: false, 
        error: error.message || 'Something went wrong' 
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        seller,
        loading,
        login,
        loginWithOTP,
        register,
        registerWithOTP,
        logout,
        updateSellerDetails,
        authFetch,
        setSeller,
        loginWithOTP,
        registerWithOTP,
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
