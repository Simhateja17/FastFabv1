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
          credentials: 'include', // Include cookies in the request
          mode: 'cors' // Explicitly set CORS mode
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
            credentials: 'include',
            mode: 'cors'
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

    // Add timeout and retry logic with increased timeout for production
    const controller = new AbortController();
    // Use a longer timeout for production environments
    const timeoutMs = url.includes('localhost') ? 15000 : 30000;
    const timeoutId = setTimeout(() => {
      console.warn(`Request to ${url} timed out after ${timeoutMs}ms`);
      controller.abort();
    }, timeoutMs);
    
    // Add signal to options if not already provided
    const requestOptions = {
      ...options,
      signal: options.signal || controller.signal
    };
    
    const makeRequest = async (token = accessToken, retryCount = 0) => {
      try {
        const requestHeaders = { ...headers };
        if (token) {
          requestHeaders.Authorization = `Bearer ${token}`;
        }
        
        console.log(`Making request to ${url} (retry: ${retryCount})`);
        
        // Add connection debugging for production environments
        if (!url.includes('localhost')) {
          console.log(`Connection test before fetch: ${new Date().toISOString()}`);
        }
        
        const response = await fetch(url, {
          ...requestOptions,
          headers: requestHeaders,
          credentials: 'include', // Always include cookies
          mode: 'cors' // Explicitly set CORS mode
        });

        // Log response status and content type for debugging
        console.log(`Response: ${response.status} ${response.statusText}`);
        const contentType = response.headers.get('content-type') || '';
        
        // Check for auth errors that need handling
        if (response.status === 401) {
          console.log("Received 401 Unauthorized, trying to refresh token");
          
          if (retryCount === 0 && refreshToken) {
            // Try to refresh the token and retry the request once
            try {
              const newToken = await refreshAccessToken();
              if (newToken) {
                console.log("Successfully refreshed token, retrying request");
                clearTimeout(timeoutId);
                // Retry the request with the new token
                return makeRequest(newToken, retryCount + 1);
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
        // Add more detailed logging for network errors
        if (error.name === 'AbortError') {
          console.warn(`Request aborted/timed out: ${url}`);
        } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.warn(`Network error when fetching from ${url}: ${error.message}`);
          
          // Log additional information for CORS or connection issues
          console.error(`Detailed error: ${error.stack || 'No stack trace'}`);
          
          // For "0 Network Error" cases which are commonly CORS issues
          if (error.message.includes('0') || error.message.toLowerCase().includes('network error')) {
            console.error("Possible CORS issue or server unreachable");
          }
        }
        
        // For network errors, retry once and don't log out
        if ((error.name === 'AbortError' || error instanceof TypeError) && retryCount === 0) {
          console.warn(`Network error: ${error.message}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return makeRequest(token, retryCount + 1);
        }
        
        // For network errors that might be CORS-related, try one more time with no-cors mode
        if (error instanceof TypeError && error.message.includes('Failed to fetch') && retryCount === 1) {
          console.warn(`Possible CORS issue: ${error.message}, trying with no-cors mode...`);
          
          // For no-cors mode, we can't access the response content, but can test connectivity
          try {
            console.log(`Attempting no-cors mode for ${url}`);
            const noCorsResponse = await fetch(url, {
              method: 'GET', // Only GET is allowed with no-cors
              mode: 'no-cors',
              credentials: 'include'
            });
            
            console.log(`no-cors response type: ${noCorsResponse.type}`);
            // We can't actually use this response with no-cors, but if it doesn't throw,
            // we know we can reach the server. We'll still throw the original error below.
          } catch (noCorsError) {
            console.error(`no-cors request also failed: ${noCorsError.message}`);
          }
        }
        
        // For network errors, don't clear tokens or log users out
        if (error.name === 'AbortError' || error instanceof TypeError) {
          console.warn(`Network error: ${error.message}, but maintaining session`);
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
      // Don't throw errors for network issues
      if (error.name === 'AbortError' || error instanceof TypeError) {
        // Return a response-like object that won't trigger token clearing
        return {
          ok: false,
          status: 0,
          statusText: "Network Error",
          json: async () => ({ message: "Network error", networkError: true }),
          text: async () => "Network error",
        };
      }
      throw error;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("[AuthContext] Initializing auth state..."); // Log start
        const { accessToken, refreshToken } = getTokens();
        
        console.log("[AuthContext] Tokens from storage:", { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken }); // Log tokens found

        if (!accessToken && !refreshToken) {
          console.log("[AuthContext] No tokens found, auth init complete (no user).");
          setLoading(false);
          return;
        }

        // If we have a refresh token but no access token, try to refresh
        if (!accessToken && refreshToken) {
          console.log("[AuthContext] No access token, attempting refresh...");
          try {
            await refreshAccessToken();
             console.log("[AuthContext] Token refresh successful during init.");
            // After successful refresh, the seller state should be set internally by refreshAccessToken
            setLoading(false);
            return;
          } catch (refreshError) {
            console.error("[AuthContext] Failed to refresh token during init:", refreshError);
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

        // Try to get seller profile with current access token
        try {
          console.log("[AuthContext] Have access token, attempting to fetch profile...");
          // --- Make sure this fetch call uses the correct endpoint --- 
          // It was previously `/api/auth/profile`, let's ensure it's correct
          const profileEndpoint = '/api/seller/profile'; // Assuming profile is under /api/seller now
          console.log(`[AuthContext] Fetching profile from: ${profileEndpoint}`);
          const response = await fetch(profileEndpoint, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            credentials: 'include' // Include cookies
          });

          console.log(`[AuthContext] Profile fetch response status: ${response.status}`); // Log status

          if (response.ok) {
            const sellerData = await response.json();
            // --- Check the structure of sellerData --- 
            console.log("[AuthContext] Profile fetch successful, raw data:", JSON.stringify(sellerData));
            // Ensure we are setting the correct data structure 
            // The backend /api/seller/profile returns { success: true, data: {...seller details...} }
            if (sellerData && sellerData.success && sellerData.data) { 
                console.log("[AuthContext] Setting seller state with data:", JSON.stringify(sellerData.data));
                setSeller(sellerData.data);
            } else {
                 console.warn("[AuthContext] Profile data received but format is unexpected:", JSON.stringify(sellerData));
                 setSeller(null); // Set seller to null if data format is wrong
                 clearTokens(); // Clear tokens if profile data is bad
            }
          } else if (response.status === 401) {
             // ... (rest of the 401 / refresh logic - seems okay) ...
          } else {
            // Handle other non-OK responses without necessarily logging out
            console.error(`[AuthContext] Profile fetch failed with status: ${response.status}`);
            // Consider if tokens should be cleared here or not depending on error type
             // clearTokens(); 
             // setSeller(null);
          }
        } catch (fetchError) {
            console.error("[AuthContext] Auth profile fetch network/fetch error:", fetchError);
        }
      } catch (error) {
        console.error("[AuthContext] Auth initialization error:", error);
      } finally {
        console.log("[AuthContext] Auth initialization finished.");
        setLoading(false);
      }
    };

    initializeAuth();
  }, []); // Keep dependency array empty to run only once on mount

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
