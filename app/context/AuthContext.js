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

  // Get the current access token, refreshing if necessary
  const getAccessToken = async () => {
    try {
      const { accessToken, refreshToken } = getTokens();
      
      // If we have a valid access token, return it
      if (accessToken) {
        return accessToken;
      }
      
      // If no access token but we have a refresh token, try to refresh
      if (!accessToken && refreshToken) {
        return await refreshAccessToken();
      }
      
      return null;
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  };

  // Refresh the access token using the refresh token
  const refreshAccessToken = async () => {
    try {
      const { refreshToken } = getTokens();

      if (!refreshToken) {
        console.error("No refresh token available for refresh");
        throw new Error("No refresh token available");
      }

      console.log("Attempting to refresh token with:", refreshToken ? refreshToken.substring(0, 10) + "..." : "none");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        // Add a timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        // Try with trailing slash first to handle both router configurations
        const response = await fetch(`/api/auth/refresh/?_=${timestamp}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal,
          credentials: 'include' // Include cookies in the request
        });

        clearTimeout(timeoutId);
        
        console.log("Token refresh response:", response.status, response.statusText);
        
        // If 404 error, try alternative URL format without trailing slash
        if (response.status === 404) {
          console.log("Refresh endpoint not found with trailing slash, trying without");
          const altResponse = await fetch(`/api/auth/refresh?_=${timestamp}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
            credentials: 'include'
          });
          
          console.log("Alternative refresh endpoint response:", altResponse.status);
          
          if (altResponse.ok) {
            const data = await altResponse.json();
            console.log("Token refresh successful with alternative URL");
            
            if (!data.accessToken) {
              console.error("Missing access token in refresh response:", data);
              throw new Error("Invalid refresh response: missing access token");
            }
            
            // Store tokens
            setTokens(data.accessToken, data.refreshToken || refreshToken);
            
            if (data.seller) {
              setSeller(data.seller);
            }

            return data.accessToken;
          }
          
          // If alternative also failed, handle error
          if (!altResponse.ok) {
            throw new Error(`Failed to refresh token: ${altResponse.status}`);
          }
        }
        
        if (response.status >= 500) {
          // Server error - don't clear tokens on server issues
          console.warn("Server error during token refresh");
          // Return the existing access token to prevent immediate logout
          return getTokens().accessToken;
        }

        if (!response.ok) {
          // Get error details for better debugging
          let errorMessage = `Failed to refresh token: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If not JSON, try to get text
            try {
              const errorText = await response.text();
              console.error("Error response text:", errorText);
            } catch (textError) {
              // Ignore if we can't get text
            }
          }

          // Handle specific error cases
          if (response.status === 401) {
            // Token invalid or expired
            throw new Error("Invalid refresh token");
          } else if (response.status === 404) {
            // Endpoint not found - this is likely a routing issue
            console.error("Refresh endpoint not found (404). Check API routes configuration.");
            throw new Error("Token refresh endpoint not found");
          } else {
            // Other client errors
            throw new Error(errorMessage);
          }
        }

        const data = await response.json();
        console.log("Token refresh successful, got new tokens");
        
        if (!data.accessToken) {
          console.error("Missing access token in refresh response:", data);
          throw new Error("Invalid refresh response: missing access token");
        }
        
        // Store tokens in localStorage for backward compatibility
        setTokens(data.accessToken, data.refreshToken || refreshToken);
        
        if (data.seller) {
          setSeller(data.seller);
        }

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
    console.log(`Starting authFetch for: ${url}`);
    const { accessToken, refreshToken } = getTokens();
    
    console.log(`Auth tokens available: access=${!!accessToken}, refresh=${!!refreshToken}`);

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
        
        console.log(`Making request to ${url} (retry: ${retryCount})`);
        const response = await fetch(url, {
          ...options,
          headers: requestHeaders,
          signal: controller.signal,
          credentials: 'include' // Always include cookies
        });

        // Log response status and content type for debugging
        console.log(`Response: ${response.status} ${response.statusText}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);

        // If unauthorized and we have a refresh token, try to refresh
        if (response.status === 401 && retryCount === 0) {
          console.log("Got 401, attempting to refresh token");
          try {
            // Try to refresh the token
            const newAccessToken = await refreshAccessToken();
            
            // Retry the request with the new token
            console.log("Token refreshed, retrying original request");
            return makeRequest(newAccessToken, retryCount + 1);
          } catch (refreshError) {
            console.error("Token refresh failed during request:", refreshError.message);
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

        // Check for 404 errors specifically
        if (response.status === 404) {
          console.error(`Resource not found: ${url}`);
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
        console.log("Initializing auth state...");
        const { accessToken, refreshToken } = getTokens();
        
        console.log("Tokens from storage:", !!accessToken, !!refreshToken);

        if (!accessToken && !refreshToken) {
          console.log("No tokens found, nothing to restore");
          setLoading(false);
          return;
        }

        // If we have a refresh token but no access token, try to refresh
        if (!accessToken && refreshToken) {
          console.log("No access token but have refresh token, attempting refresh");
          try {
            await refreshAccessToken();
            // After successful refresh, we'll have the updated seller state
            setLoading(false);
            return;
          } catch (refreshError) {
            console.error("Failed to refresh token during init:", refreshError);
            // Only clear on specific auth errors
            if (refreshError.message === "No refresh token available" ||
                refreshError.message === "Invalid refresh token") {
              clearTokens();
              setSeller(null);
            }
            setLoading(false);
            return;
          }
        }

        // Try to get seller profile with current token
        try {
          console.log("Getting seller profile with access token");
          const response = await fetch(`/api/auth/profile`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            credentials: 'include' // Include cookies
          });

          if (response.ok) {
            const sellerData = await response.json();
            console.log("Profile fetch successful, setting seller data");
            setSeller(sellerData);
          } else if (response.status === 401) {
            // If unauthorized, try to refresh token
            console.log("Profile fetch returned 401, attempting token refresh");
            try {
              const newToken = await refreshAccessToken();
              
              if (newToken) {
                // Try to fetch profile again with new token
                const retryResponse = await fetch(`/api/auth/profile`, {
                  headers: {
                    Authorization: `Bearer ${newToken}`,
                  },
                  credentials: 'include'
                });
                
                if (retryResponse.ok) {
                  const sellerData = await retryResponse.json();
                  console.log("Profile fetch with refreshed token successful");
                  setSeller(sellerData);
                } else {
                  console.error("Profile fetch failed even after token refresh");
                  if (retryResponse.status === 401) {
                    clearTokens();
                    setSeller(null);
                  }
                }
              }
            } catch (refreshError) {
              console.error("Token refresh failed during init:", refreshError);
              // Only clear on specific auth errors
              if (refreshError.message === "No refresh token available" ||
                  refreshError.message === "Invalid refresh token") {
                clearTokens();
                setSeller(null);
              }
            }
          } else if (response.status >= 500) {
            // Server error - maintain current state
            console.warn("Server error during auth initialization, maintaining current state");
          } else {
            // Other client errors
            console.error(`Unexpected auth response: ${response.status}`);
            clearTokens();
            setSeller(null);
          }
        } catch (fetchError) {
          // Network error or other fetch failure
          console.error("Auth profile fetch failed:", fetchError);
          // Don't clear tokens on network errors
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
  const login = async (phone, password, isOtpLogin = false) => {
    try {
      setLoading(true);

      // Always use OTP login for sellers now
      const endpoint = `/api/auth/signin-with-otp`;
      const body = { phone };

      console.log('Attempting to login with phone:', phone);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: 'include' // Include cookies in request
      });

      console.log('Login response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Login response:', data.success ? 'Success' : 'Failed');

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      // Check if we got tokens back
      if (data.accessToken && data.refreshToken) {
        // Store in localStorage for backward compatibility
        setTokens(data.accessToken, data.refreshToken);
        
        // Update seller state
        if (data.seller) {
          setSeller(data.seller);
        }
        
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

  // Register function
  const register = async (phone, password) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
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
      await authFetch(`/api/auth/logout`, { method: "POST" });
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
      const response = await authFetch(`/api/auth/${sellerId}/details`, {
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

  // Send WhatsApp OTP for seller verification
  const sendSellerOTP = async (phone) => {
    try {
      setLoading(true);
      
      // Use the new seller WhatsApp OTP endpoint
      const response = await fetch(`/api/seller-whatsapp-otp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || 'Failed to send OTP' 
        };
      }

      return { 
        success: true, 
        expiresAt: data.expiresAt,
        isExistingSeller: data.isExistingSeller  
      };
    } catch (error) {
      console.error("Send seller OTP error:", error);
      return { 
        success: false, 
        error: error.message || 'Something went wrong' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Verify WhatsApp OTP for seller
  const verifySellerOTP = async (phone, otpCode) => {
    try {
      setLoading(true);
      
      // Use the new seller WhatsApp OTP verification endpoint
      const response = await fetch(`/api/seller-whatsapp-otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          phoneNumber: phone, 
          otpCode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || 'Failed to verify OTP' 
        };
      }

      return { 
        success: true,
        isNewSeller: data.isNewSeller,
        isExistingSeller: data.isExistingSeller,
        sellerId: data.sellerId,
        isSellerComplete: data.isSellerComplete
      };
    } catch (error) {
      console.error("Verify seller OTP error:", error);
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
        register,
        logout,
        updateSellerDetails,
        authFetch,
        setSeller,
        sendSellerOTP,
        verifySellerOTP,
        getAccessToken
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
