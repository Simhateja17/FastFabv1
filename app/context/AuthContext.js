"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";


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
        // Using '/api/seller/auth/refresh/' assuming seller-specific auth routes
        const refreshEndpoint = `/api/seller/auth/refresh/?_=${timestamp}`;
        console.log(`Attempting refresh at: ${refreshEndpoint}`);

        const response = await fetch(refreshEndpoint, {
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
          const altRefreshEndpoint = `/api/seller/auth/refresh?_=${timestamp}`;
          console.log(`Attempting refresh at alternative: ${altRefreshEndpoint}`);
          const altResponse = await fetch(altRefreshEndpoint, {
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
            
            // Check for seller data in response (might come from refresh now)
            if (data.seller) {
                console.log("Setting seller data from refresh response:", data.seller);
                setSeller(data.seller);
            } else {
                 // If seller data isn't in the refresh response, we might need to fetch it separately
                 // or rely on the initial profile fetch. Let's log this.
                 console.log("No seller data in refresh response. Profile fetch may be needed.");
            }

            return data.accessToken;
          }
          
          // If alternative also failed, handle error based on its status
          if (!altResponse.ok) {
            // Re-throw a specific error based on the alternative response
            throw new Error(`Failed to refresh token (alt URL): ${altResponse.status}`);
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
        
        // Store tokens in localStorage
        setTokens(data.accessToken, data.refreshToken || refreshToken);
        
        // Check for seller data in response
        if (data.seller) {
            console.log("Setting seller data from primary refresh response:", data.seller);
            setSeller(data.seller);
        } else {
            console.log("No seller data in primary refresh response.");
        }

        return data.accessToken;
      } catch (fetchError) {
        clearTimeout(timeoutId); // Ensure timeout is cleared on fetch errors too
        
        // Network errors (abort, network failure) shouldn't clear auth state
        if (fetchError.name === 'AbortError' || fetchError instanceof TypeError) {
          console.warn("Network issue during token refresh:", fetchError.message);
          // Return existing token to maintain session during network issues
          return getTokens().accessToken;
        }
        
        throw fetchError; // Re-throw other errors (like JSON parsing, etc.)
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      
      // Only clear auth on specific error conditions that indicate invalid authentication
      if (
        error.message === "No refresh token available" || 
        error.message === "Invalid refresh token" ||
        error.message.startsWith("Failed to refresh token (alt URL): 401") // Handle 401 from alt URL too
      ) {
        console.log("Clearing tokens and seller due to refresh error:", error.message);
        clearTokens();
        setSeller(null);
      }
      
      // Re-throw the error so callers (like authFetch or initializeAuth) know it failed
      throw error;
    }
  };

  // Wrap authFetch in useCallback
  const authFetch = useCallback(async (url, options = {}) => {
    let accessToken = localStorage.getItem("accessToken");
    
    console.log(`[AuthFetch] Requesting: ${url}, Method: ${options.method || 'GET'}`);
    console.log(`[AuthFetch] Initial Access Token available: ${!!accessToken}`);

    // Helper function to attempt refresh
    const attemptRefresh = async () => {
      console.log("[AuthFetch] Attempting token refresh...");
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        console.log("[AuthFetch] No refresh token found.");
        logout();
        throw new Error("Authentication required. Please login again.");
      }

      try {
        // Use a direct fetch for refresh to avoid circular dependency
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
        
        const refreshData = await refreshResponse.json();
        
        if (!refreshResponse.ok) {
          console.error("[AuthFetch] Refresh failed:", refreshData);
          logout(); 
          throw new Error(refreshData.message || "Session expired. Please login again.");
        }
        
        console.log("[AuthFetch] Token refresh successful.");
        localStorage.setItem("accessToken", refreshData.accessToken);
        localStorage.setItem("refreshToken", refreshData.refreshToken); // Update refresh token too
        return refreshData.accessToken;
      } catch (error) {
        console.error("[AuthFetch] Error during token refresh:", error);
        logout();
        throw new Error("Failed to refresh session. Please login again.");
      }
    };

    // Initial request function
    const makeRequest = async (token, attempt = 1) => {
        console.log(`[AuthFetch] Making request (Attempt ${attempt}) with token: ${token ? 'Yes' : 'No'}`);
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
      
      // Ensure Content-Type is set for relevant methods, but not for FormData
      if (!options.body || !(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      } else {
        // If body is FormData, delete Content-Type so browser can set it with boundary
        delete headers['Content-Type'];
      }
      
      console.log(`[AuthFetch] Headers being sent:`, Object.keys(headers));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log(`[AuthFetch] Response status for ${url}: ${response.status}`);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        // Only log as error if it's not an AbortError (timeout)
        if (error.name !== 'AbortError') {
            console.error(`[AuthFetch] Fetch error for ${url}:`, error);
        } else {
            console.warn(`[AuthFetch] Request timed out for ${url}`);
        }
        throw error; // Re-throw the error
      }
    };

    // Try initial request
    let response = await makeRequest(accessToken);

    // If unauthorized (401) or forbidden (403), try refreshing the token
    if (response.status === 401 || response.status === 403) {
      console.log(`[AuthFetch] Received ${response.status}, attempting token refresh.`);
      try {
        accessToken = await attemptRefresh();
        // Retry the request with the new token
        console.log("[AuthFetch] Retrying request with new token.");
        response = await makeRequest(accessToken, 2); 
        
        // Check status of retry
        if (!response.ok) {
             console.warn(`[AuthFetch] Retry request failed with status: ${response.status}`);
             // Handle potential errors after retry (e.g., still 401/403 or other errors)
             if (response.status === 401 || response.status === 403) {
                 logout();
                 throw new Error("Authentication failed after refresh. Please login again.");
             }
             // You might want to throw a more specific error based on the retry status
        }
        
      } catch (refreshError) {
        // If refresh fails, logout() is called within attemptRefresh
        console.error("[AuthFetch] Refresh attempt failed, propagating error.");
        throw refreshError; // Re-throw the error from refresh attempt
      }
    }

    return response;
  }, [logout]);

  useEffect(() => {
    // Add listener or any side effects related to authFetch if needed
    // Example: maybe log when authFetch function reference changes (though useCallback prevents this)
    console.log("[AuthContext] AuthFetch function (re)created/referenced."); 
  }, [authFetch]); // Add authFetch dependency

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount

    const initializeAuth = async () => {
      try {
        console.log("[AuthContext] Initializing auth state...");
        const { accessToken, refreshToken } = getTokens();
        
        console.log("[AuthContext] Tokens from storage:", { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

        if (!refreshToken) {
          // No refresh token means definitely not logged in
          console.log("[AuthContext] No refresh token found. User is not logged in.");
          if (isMounted) {
              setSeller(null); // Ensure seller state is cleared
              setLoading(false);
          }
          return;
        }

        let currentAccessToken = accessToken;

        // If no access token but have refresh token, try refreshing immediately
        if (!currentAccessToken) {
          console.log("[AuthContext] No access token, attempting refresh...");
          try {
            currentAccessToken = await refreshAccessToken(); // This will set seller state if successful and seller data is returned
             if (currentAccessToken) {
                 console.log("[AuthContext] Token refresh successful during init.");
             } else {
                 console.warn("[AuthContext] Token refresh during init returned no token.");
                 // If refresh fails but doesn't throw a critical error (e.g., network issue),
                 // we might still be logged out effectively. Let profile fetch handle it.
             }
          } catch (refreshError) {
            // refreshAccessToken already handles clearing tokens on critical auth errors (401)
            console.error("[AuthContext] Failed to refresh token during init:", refreshError.message);
             // If refresh failed critically, seller is already null, loading should stop.
             if (isMounted) setLoading(false);
             return; // Stop initialization if refresh fails critically
          }
        }

        // If after potential refresh, we still have no access token, we can't proceed
        if (!currentAccessToken) {
            console.log("[AuthContext] Still no access token after potential refresh. Cannot fetch profile.");
            if (isMounted) {
                // It's possible refresh failed non-critically (network) but left us without a token
                // Let's ensure state reflects this if refresh didn't already clear it.
                clearTokens(); 
                setSeller(null);
                setLoading(false);
            }
            return;
        }

        // Now, try to fetch the seller profile using the obtained access token
        console.log("[AuthContext] Have access token, attempting to fetch profile...");
        // Use the correct seller profile endpoint
        const profileEndpoint = '/api/seller/profile'; 
        console.log(`[AuthContext] Fetching profile from: ${profileEndpoint}`);
        
        // Use authFetch for profile fetch as it handles potential 401s during this call too
        const response = await authFetch(profileEndpoint); 

        console.log(`[AuthContext] Profile fetch response status: ${response.status}`);

        if (response.ok) {
            const profileData = await response.json();
            console.log("[AuthContext] Profile fetch successful, raw data:", JSON.stringify(profileData));
            
            // Assuming backend returns { success: true, data: {...seller details...} }
            if (profileData && profileData.success && profileData.data) { 
                console.log("[AuthContext] Setting seller state with profile data:", JSON.stringify(profileData.data));
                 if (isMounted) setSeller(profileData.data);
            } else {
                 console.warn("[AuthContext] Profile data received but format is unexpected or success=false:", JSON.stringify(profileData));
                 // If profile fetch worked (e.g., 200 OK) but data is bad, treat as logged out
                 if (isMounted) {
                     clearTokens();
                     setSeller(null);
                 }
            }
        } else {
            // Handle non-OK responses from profile fetch (authFetch might have already refreshed)
            console.error(`[AuthContext] Profile fetch failed with status: ${response.status}. User might be logged out.`);
             // If authFetch resulted in a 401 (even after refresh attempt), or other error, clear state.
             // Also handle network errors returned by authFetch (status 0)
            if (isMounted && (response.status === 401 || response.status === 0)) {
                // Tokens likely cleared by refreshAccessToken or this indicates invalid session
                setSeller(null); // Ensure seller is cleared
            }
            // For other errors (e.g., 500), we might keep the tokens temporarily, but seller won't be set.
        }

      } catch (error) {
        // Catch any unexpected errors during the initialization process
        console.error("[AuthContext] Unexpected error during auth initialization:", error);
         if (isMounted) {
             // Safe default: clear state on unexpected errors
             clearTokens();
             setSeller(null);
         }
      } finally {
        console.log("[AuthContext] Auth initialization finished.");
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function to prevent setting state on unmounted component
    return () => {
        isMounted = false;
        console.log("[AuthContext] Unmounting, cancelling potential state updates.");
    };
  }, []); // Empty dependency array runs only once on mount

  // Login function (Simplified for OTP only)
  const login = async (phone) => {
    try {
      // Removed setLoading(true) here, let components manage their own loading states
      // based on the promise resolution if needed. setLoading in AuthContext is for initial load.

      const endpoint = `/api/auth/signin-with-otp`; // Updated endpoint path
      const body = { phone };

      console.log('Attempting OTP sign-in for phone:', phone);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      console.log('Sign-in response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Sign-in response data:', data);

      if (!response.ok) {
        // Throw an error that the caller can catch
        throw new Error(data.message || `Sign-in failed with status ${response.status}`);
      }

      // OTP sign-in successful, expect tokens and seller data
      if (data.accessToken && data.refreshToken && data.seller) {
        setTokens(data.accessToken, data.refreshToken);
        setSeller(data.seller); // Update seller state
        console.log("Sign-in successful, tokens stored, seller state updated.");
        return { success: true, seller: data.seller }; // Return success and seller data
      } else {
        console.error('Missing tokens or seller data in sign-in response:', data);
        throw new Error('Invalid server response during sign-in');
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      // Re-throw the error so the calling component knows it failed and can show a message
      throw error;
    }
    // Removed finally setLoading(false)
  };

  // Register function (Assuming this is now handled by OTP flow or separate process)
  // If direct registration with phone/password is still needed, uncomment and update endpoint.
  /*
  const register = async (phone, password) => {
    try {
      // setLoading(true); // Manage loading in component
      // Update endpoint if needed
      const response = await fetch(`/api/auth/signup`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }), // Send password if required
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }
      // Assuming registration also returns tokens and seller data
      if (data.accessToken && data.refreshToken && data.seller) {
         setTokens(data.accessToken, data.refreshToken);
         setSeller(data.seller);
         return { success: true, seller: data.seller };
      } else {
         throw new Error("Invalid registration response from server");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error; // Re-throw
    } finally {
      // setLoading(false);
    }
  };
  */

  // Logout function
  const logout = async () => {
    console.log("Attempting logout...");
    try {
      // Call the logout endpoint using authFetch to ensure token is sent
      // Use seller-specific endpoint
      const response = await authFetch(`/api/seller/auth/logout`, { method: "POST" }); 
      console.log("Logout API call status:", response.status);
      if (!response.ok && response.status !== 401) {
         // Log errors unless it's 401 (meaning already logged out server-side)
         console.warn(`Logout API call failed with status: ${response.status}`);
         try {
             const errorData = await response.json();
             console.warn("Logout error data:", errorData);
         } catch (e) {
             console.warn("Could not parse logout error response.");
         }
      }
    } catch (error) {
      // Catch network errors from authFetch
      console.error("Error during logout API call:", error);
    } finally {
      // Always clear local state regardless of API call success/failure
      console.log("Clearing local tokens and seller state.");
      clearTokens();
      setSeller(null);
      // Optionally: redirect or update UI after state is cleared
      // window.location.href = '/login'; // Example redirect
    }
  };

  // Update seller details
  const updateSellerDetails = async (details) => {
     if (!seller || !seller._id) {
         console.error("Cannot update details: Seller ID is missing.");
         throw new Error("Seller not available for update.");
     }
     const sellerId = seller._id; // Get ID from current seller state
     console.log(`Attempting to update details for seller ID: ${sellerId}`);
    try {
      // Use seller-specific endpoint, ensure it matches your API route structure
      // Example: /api/seller/profile or /api/seller/{sellerId}/details
      const response = await authFetch(`/api/seller/profile`, { // Assuming PATCH to profile updates details
        method: "PATCH",
        body: JSON.stringify(details),
      });

      if (!response.ok) {
        let errorMsg = "Failed to update seller details";
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
        } catch (e) { /* Ignore parsing error */ }
        console.error(`Update details failed: ${response.status} - ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const data = await response.json();
       // Assuming the PATCH response returns the updated seller object in `data.data`
       if (data && data.success && data.data) {
            console.log("Seller details updated successfully. Updating context.", data.data);
            setSeller(data.data); // Update context with the latest data
            return { success: true, seller: data.data };
       } else {
            console.warn("Update details response format unexpected:", data);
            // Fetch profile again to ensure consistency if response format is odd
            await fetchCurrentSellerProfile(); 
            return { success: false, error: "Update succeeded but response format unexpected." };
       }
    } catch (error) {
      console.error("Error updating seller details:", error);
      throw error; // Re-throw error for the caller
    }
  };

  // Send WhatsApp OTP for seller verification/login
  const sendSellerOTP = async (phone) => {
    // Removed setLoading(true)
    try {
      console.log(`Sending OTP to phone: ${phone}`);
      // Use the correct seller WhatsApp OTP endpoint
      const response = await fetch(`/api/seller-whatsapp-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Send OTP failed: ${response.status} - ${data.message}`);
        throw new Error(data.message || 'Failed to send OTP');
      }

      console.log("Send OTP successful:", data);
      // Return relevant data to the component
      return { 
        success: true, 
        expiresAt: data.expiresAt, // Let component handle expiry display
        isExistingSeller: data.isExistingSeller // Useful for UI logic
      };
    } catch (error) {
      console.error("Send seller OTP error:", error);
      throw error; // Re-throw
    } finally {
      // Removed setLoading(false)
    }
  };

  // Verify WhatsApp OTP for seller
  const verifySellerOTP = async (phone, otpCode) => {
    // Removed setLoading(true)
    try {
      console.log(`Verifying OTP for phone: ${phone} with code: ${otpCode}`);
      // Use the correct seller WhatsApp OTP verification endpoint
      const response = await fetch(`/api/seller-whatsapp-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
         console.error(`Verify OTP failed: ${response.status} - ${data.message}`);
        throw new Error(data.message || 'Failed to verify OTP');
      }

      console.log("Verify OTP successful:", data);

      // Handle side effects based on verification result
      if (data.success && data.accessToken && data.refreshToken && data.seller) {
          // If verification returns tokens (meaning successful login/registration)
          console.log("OTP verified, received tokens and seller data. Updating auth state.");
          setTokens(data.accessToken, data.refreshToken);
          setSeller(data.seller);
      } else if (data.success) {
          // If verification succeeded but didn't necessarily log the user in
          // (e.g., just verifying phone number during signup)
          console.log("OTP verification successful, but no tokens received in this step.");
      }

      // Return all relevant data to the component
      return { 
        success: true,
        isNewSeller: data.isNewSeller,
        isExistingSeller: data.isExistingSeller,
        sellerId: data.sellerId, // Might be useful even if not logged in yet
        isSellerComplete: data.isSellerComplete, // For profile completion checks
        // Include tokens/seller if returned, otherwise they'll be undefined
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        seller: data.seller 
      };
    } catch (error) {
      console.error("Verify seller OTP error:", error);
      throw error; // Re-throw
    } finally {
      // Removed setLoading(false)
    }
  };

  // Fetch the current seller's profile details from the backend
  const fetchCurrentSellerProfile = async () => {
    console.log("Attempting to fetch current seller profile data...");
    if (!getTokens().accessToken) {
        console.warn("Cannot fetch profile: No access token available.");
        // Optionally clear state here if this situation arises unexpectedly
        // clearTokens(); setSeller(null);
        return { success: false, error: "Not authenticated" };
    }
    
    try {
      // Use authFetch for authenticated request to the seller profile endpoint
      const response = await authFetch('/api/seller/profile'); 

      if (!response.ok) {
        let errorMsg = "Failed to fetch seller profile";
         try {
            // Attempt to parse error only if it's likely JSON
            if (response.headers.get('content-type')?.includes('application/json')) {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } else {
                errorMsg = `${errorMsg} (${response.status} ${response.statusText})`;
            }
         } catch (e) { 
             errorMsg = `${errorMsg} (Could not parse error response: ${response.status} ${response.statusText})`;
         }
        console.error(`Profile fetch failed: ${response.status} - ${errorMsg}`);
        
        // If the error is 401 or network error (0), logout might have happened or session is invalid
        if (response.status === 401 || response.status === 0) {
            console.log("Clearing seller state due to profile fetch failure (401 or network error).");
            setSeller(null); // Don't clear tokens here, authFetch handles refresh/clearing based on refresh token validity
        }
        return { success: false, error: errorMsg };
      }

      // Profile fetch was successful (2xx status)
      const data = await response.json();
      
      // Expecting { success: true, data: sellerObject }
      if (data && data.success && data.data) {
          console.log("Successfully fetched seller profile data, updating context.", data.data);
          setSeller(data.data); // Update the context state with fresh data
          return { success: true, seller: data.data };
      } else {
           console.error("API response missing seller data or success=false:", data);
           // If the fetch was OK but data is bad, treat as an error, potentially clear state
           setSeller(null); // Clear seller if data format is wrong
           // Don't clear tokens here, maybe it was a temporary server issue returning bad data
           return { success: false, error: "Invalid profile data received from server" };
      }
      
    } catch (error) {
      // Catch errors from authFetch (e.g., network errors re-thrown)
      console.error("Error during fetchCurrentSellerProfile:", error);
      // Don't clear state on general fetch errors, could be temporary network issue
      return { success: false, error: error.message || "An unexpected error occurred while fetching profile" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        seller,
        // Avoid exposing setSeller directly if possible, use specific functions like updateSellerDetails
        // setSeller, 
        loading, // Represents initial loading state
        login, // Simplified OTP-based login/signin trigger
        logout,
        // register, // Include if register function is kept
        sendSellerOTP, // Function to trigger OTP sending
        verifySellerOTP, // Function to verify OTP (might log in or just verify)
        updateSellerDetails, // Function to update seller profile info
        fetchCurrentSellerProfile, // Function to manually refresh profile data
        authFetch, // Expose authenticated fetch for custom API calls if needed
        getAccessToken // Expose ability to get current token (handles refresh)
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
