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
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased from 15000 (15s) to 30000 (30s)

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

    // Safety check: If this is a seller visibility endpoint and seller is not available, return an error
    if (url.includes('/seller/visibility') && !seller) {
      console.error('Cannot perform seller visibility operations: No seller data available');
      return new Response(JSON.stringify({
        success: false,
        message: 'Seller data not available. Please refresh the page or log in again.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        ok: false
      });
    }

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
    const timeoutDuration = options.timeout || 30000; // Use provided timeout or default to 30s
    const timeoutId = setTimeout(() => {
      console.warn(`Request to ${url} timed out after ${timeoutDuration}ms`);
      controller.abort('timeout');
    }, timeoutDuration);
    
    const makeRequest = async (token = accessToken, retryCount = 0) => {
      try {
        const requestHeaders = { ...headers };
        if (token) {
          requestHeaders.Authorization = `Bearer ${token}`;
        }
        
        // Merge the signal from controller with any existing signal
        const signal = controller.signal;
        
        console.log(`Making request to ${url} (retry: ${retryCount})`);
        
        // Set up a timeout and retry params
        const fetchOptions = {
          ...options,
          headers: requestHeaders,
          signal,
        };
        
        // Attempt the fetch with network error handling
        try {
          const response = await fetch(url, fetchOptions);
          return { response, hasNetworkError: false };
        } catch (networkError) {
          // Handle network errors separately
          console.error(`Network error on ${url}:`, networkError.message);
          
          // Check if this was due to a timeout
          if (networkError.name === 'AbortError') {
            return { 
              hasNetworkError: true, 
              response: new Response(JSON.stringify({ 
                success: false, 
                message: 'Request timed out' 
              }), { 
                status: 408, 
                statusText: 'Request Timeout',
                headers: { 'Content-Type': 'application/json' },
                ok: false
              })
            };
          }
          
          // For other network errors
          return { 
            hasNetworkError: true, 
            response: new Response(JSON.stringify({ 
              success: false, 
              message: 'Network Error' 
            }), { 
              status: 0, 
              statusText: 'Network Error',
              headers: { 'Content-Type': 'application/json' },
              ok: false
            })
          };
        }
      } catch (error) {
        console.error("Error in makeRequest:", error);
        
        // Return a standardized error response
        return {
          hasNetworkError: true,
          response: new Response(JSON.stringify({
            success: false,
            message: error.message || 'Unknown error'
          }), {
            status: 500,
            statusText: 'Internal Client Error',
            headers: { 'Content-Type': 'application/json' },
            ok: false
          })
        };
      }
    };

    try {
      const { response, hasNetworkError } = await makeRequest();
      clearTimeout(timeoutId);
      
      if (hasNetworkError) {
        console.warn(`Returning error response for ${url} due to network error`);
        return response;
      }
      
      // Log response status and content type for debugging
      console.log(`Response: ${response.status} ${response.statusText}`);
      const contentType = response.headers.get('content-type') || '';
      
      // Check for auth errors that need handling
      if (response.status === 401) {
        console.log("Received 401 Unauthorized, trying to refresh token");
        
        if (refreshToken) {
          // Try to refresh the token and retry the request once
          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              console.log("Successfully refreshed token, retrying request");
              // Retry the request with the new token
              const { response: newResponse } = await makeRequest(newToken, 1);
              return newResponse;
            }
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
            // Only clear tokens for specific auth errors
            if (refreshError.message === "Invalid refresh token" || 
                refreshError.message === "No refresh token available") {
              clearTokens();
              setSeller(null);
            }
          }
        }
      } else if (response.status === 404) {
        // Don't treat 404 as a fatal error that logs users out
        console.warn(`Endpoint not found: ${url} - This might be a routing issue`);
      } else if (response.status >= 500) {
        // Don't log users out on server errors
        console.warn(`Server error: ${response.status} when accessing ${url}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.error(`Unhandled error in authFetch for ${url}:`, error);
      
      // Create a network error response
      return new Response(JSON.stringify({
        success: false,
        message: error.message || 'Unhandled error in request'
      }), {
        status: 0,
        statusText: 'Error',
        headers: { 'Content-Type': 'application/json' },
        ok: false
      });
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
            // Don't clear tokens on network errors or non-critical auth issues
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
                  // Only clear tokens on confirmed auth issues, not network/server errors
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
          } else if (response.status >= 500 || response.status === 404) {
            // Server error or endpoint not found - maintain current state
            console.warn(`Server error or endpoint not found (${response.status}) during auth initialization, maintaining current state`);
            // Do NOT clear tokens or reset seller state on server-side issues
          } else {
            // Only handle other specific client errors
            console.error(`Unexpected auth response: ${response.status}`);
            // Don't automatically clear tokens on unexpected responses
          }
        } catch (fetchError) {
          // Network error or other fetch failure - maintain session
          console.error("Auth profile fetch failed:", fetchError);
          // Don't clear tokens on network errors
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        // Only clear tokens for critical errors, not network issues
        if (!(error instanceof TypeError) && !(error.message && error.message.includes('fetch'))) {
          // Don't clear tokens for network-related errors
          console.warn("Maintaining session despite error:", error.message);
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

  // Fetch the current seller's profile details from the backend
  const fetchCurrentSellerProfile = async () => {
    console.log("Attempting to fetch current seller profile data...");
    // Indicate loading state if desired (optional)
    // setLoading(true); 
    try {
      // Use authFetch to make an authenticated request to the profile endpoint
      // Ensure this endpoint exists in your Next.js API routes (e.g., app/api/auth/profile/route.js) 
      // or that your backend service route is correctly proxied/called.
      const response = await authFetch('/api/auth/profile'); // Assuming this endpoint fetches the logged-in seller's data

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
        console.error("Failed to fetch seller profile:", response.status, errorData.message);
        // Don't clear seller state on fetch failure, just log the error
        // Optionally: Show a toast message
        // toast.error(`Failed to load profile: ${errorData.message}`);
        return { success: false, error: errorData.message || "Failed to fetch profile" };
      }

      const data = await response.json();
      
      if (!data.seller) {
          console.error("API response missing seller data");
          return { success: false, error: "Invalid profile data received" };
      }

      console.log("Successfully fetched seller profile data, updating context.", data.seller);
      setSeller(data.seller); // Update the context state with fresh data
      return { success: true, seller: data.seller };
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      // Don't clear seller state on fetch failure
      return { success: false, error: error.message || "An unexpected error occurred" };
    } finally {
      // Indicate loading finished if using loading state (optional)
      // setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        seller,
        setSeller, // Keep setSeller if needed elsewhere, but prefer specific functions
        loading,
        login,
        logout,
        register,
        sendSellerOTP,
        verifySellerOTP,
        updateSellerDetails,
        fetchCurrentSellerProfile, // Expose the new function
        authFetch, // Expose authFetch if needed by components
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
