"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";

// Removed token management functions: setTokens, getTokens, clearTokens

const AuthContext = createContext();

// Define API endpoints (replace with actual backend URL if needed)
// const API_URL = process.env.NEXT_PUBLIC_API_URL || ""; // Use environment variable - Not needed for internal routes
const SELLER_AUTH_ENDPOINTS = {
  PROFILE: `/api/seller/auth/profile`, // Use relative paths for internal API
  LOGIN: `/api/seller/auth/login-otp`, 
  REGISTER: `/api/seller/auth/register`, 
  LOGOUT: `/api/seller/auth/logout`,
  REFRESH_TOKEN: `/api/seller/auth/refresh`,
  SEND_OTP: `/api/seller/auth/send-otp`, // Correct relative path
  VERIFY_OTP: `/api/seller/auth/verify-otp`,
  UPDATE_DETAILS: (sellerId) => `/api/seller/auth/${sellerId}/details`,
};


export function AuthProvider({ children }) {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true); // Tracks initial auth check
  const [isInitialized, setIsInitialized] = useState(false);
  const initRef = useRef(false); // Prevent double initialization in StrictMode

  // Memoize the auth state
  const authState = useMemo(() => ({
    seller,
    loading,
  }), [seller, loading]);

  // Function to fetch seller profile - used to check authentication status
  const fetchSellerProfile = useCallback(async () => {
    console.log("Attempting to fetch seller profile...");
    try {
      // Use authFetch which handles potential token refresh
      const data = await authFetch(SELLER_AUTH_ENDPOINTS.PROFILE);
      
      if (data && data.seller) {
        console.log("Seller profile fetched successfully:", data.seller.id);
        setSeller(data.seller);
        return data.seller;
      } else {
        console.log("No seller data found in profile response or fetch failed.");
        setSeller(null);
        return null;
      }
    } catch (error) {
       // Distinguish between auth errors (401) and other errors
       if (error.message.includes('401')) {
         console.log("Profile fetch failed (401): Seller likely not logged in.");
       } else {
         console.error("Error fetching seller profile:", error);
       }
       setSeller(null);
       return null;
    }
  }, []); // Add dependency array

   // Refresh the access token (called by authFetch on 401)
   const refreshAccessToken = useCallback(async () => {
     // Doesn't need the old refresh token - it's in the HttpOnly cookie
     console.log("Attempting token refresh via API (using httpOnly cookie)");
     try {
       const response = await fetch(SELLER_AUTH_ENDPOINTS.REFRESH_TOKEN, {
         method: "POST",
         // No body needed - backend reads HttpOnly cookie
         // No Content-Type needed
         credentials: "include", // Crucial: Sends HttpOnly cookies
         mode: 'cors' // Ensure CORS is handled correctly by the backend
       });

       if (!response.ok) {
         // Handle failed refresh (e.g., expired refresh token)
         let errorMessage = `Token refresh failed: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) { /* Ignore if response is not JSON */ }
         console.error("Token refresh failed:", errorMessage);
         // Don't clear seller state here, let the failed authFetch handle it
         throw new Error(errorMessage); // Propagate error
       }

       // Successful refresh means backend has set new cookies
       console.log("Token refresh successful. New cookies should be set by backend.");
       // Optionally, the refresh endpoint *could* return the new user data
       // const data = await response.json();
       // if (data && data.seller) { setSeller(data.seller); }
       return true; // Indicate success
     } catch (error) {
       console.error("Error during token refresh fetch:", error);
       // Don't clear seller state here
       throw error; // Re-throw
     }
   }, []); // Add dependency array


  // Authenticated fetch utility
  const authFetch = useCallback(async (url, options = {}) => {
    const makeRequest = async (attempt = 1) => {
      console.log(`AuthFetch: Attempt ${attempt} to ${url}`, { isCORS: url.includes('http'), origin: window.location.origin });
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          // Ensure Content-Type is set if needed (e.g., for POST/PUT)
          ...(options.body && !(options.body instanceof FormData) && {'Content-Type': 'application/json'}),
          // REMOVE manual Authorization header
        },
        credentials: "include", // Crucial: Sends HttpOnly cookies
        mode: 'cors',
        cache: 'no-cache' // Avoid caching issues with authentication
      });

      console.log(`AuthFetch: Response status for ${url}: ${response.status}`, {
        hasCookies: document.cookie.length > 0,
        cookieCount: document.cookie.split(';').filter(c => c.trim().length > 0).length
      });

      if (!response.ok) {
        if (response.status === 401 && attempt === 1) {
          // Unauthorized, likely expired access token
          console.log("AuthFetch: Received 401, attempting token refresh...");
          try {
            const refreshSuccess = await refreshAccessToken();
            if (refreshSuccess) {
              console.log("AuthFetch: Token refresh successful, retrying original request...");
              // Retry the original request
              return await makeRequest(2); // Second attempt
            } else {
               // Refresh failed definitively (e.g., invalid refresh token)
               console.log("AuthFetch: Token refresh failed, cannot retry request.");
               setSeller(null); // Clear seller state as auth is definitively lost
               throw new Error(`Unauthorized (401) - Refresh failed`);
            }
          } catch (refreshError) {
            console.error("AuthFetch: Error during token refresh:", refreshError);
            setSeller(null); // Clear seller state as refresh failed
            throw new Error(`Unauthorized (401) - Refresh error: ${refreshError.message}`);
          }
        } else {
          // Handle other non-OK responses or 401 on second attempt
          let errorMessage = `Request failed: ${response.status}`;
          try {
             const errorBody = await response.json();
             errorMessage = errorBody.message || errorMessage;
          } catch (e) { /* ignore if not json */ }
          console.error(`AuthFetch failed on attempt ${attempt}:`, errorMessage);
          throw new Error(errorMessage);
        }
      }

      // Handle successful response
      // Check if response has content before trying to parse JSON
       const contentType = response.headers.get("content-type");
       if (contentType && contentType.includes("application/json")) {
         return await response.json();
       } else {
         // Handle non-JSON responses (e.g., text, or just status check)
         console.log(`AuthFetch: Received non-JSON response (${response.status})`);
         return { success: true, status: response.status }; // Or return text if needed: await response.text();
       }
    };

    return await makeRequest();
  }, [refreshAccessToken]); // Dependency on refreshAccessToken


  // Initialize authentication state on component mount
  useEffect(() => {
    // Prevent initialization in StrictMode double render
    if (initRef.current) return;
    initRef.current = true;
    
    const initializeAuth = async () => {
      console.log("Initializing Auth State...");
      try {
        // Check if already authenticated by fetching profile
        await fetchSellerProfile();
      } catch (error) {
        // Errors during profile fetch (like 401) mean not logged in
        console.log("Initialization: Not logged in or error fetching profile.");
        setSeller(null);
      } finally {
        setLoading(false);
        setIsInitialized(true);
        console.log("Auth Initialization Complete.");
      }
    };

    initializeAuth();
  }, [fetchSellerProfile]); // Depend on fetchSellerProfile


  // Login function (assuming OTP flow where backend sets cookies)
  const login = async (phone) => {
    // This function might primarily be used AFTER OTP verification
    // to fetch the profile and confirm login status set by the backend.
    setLoading(true);
    try {
      console.log("Attempting login flow (fetching profile) for phone:", phone);
      // The actual login (token setting) happened in the verify OTP step on the backend.
      // We just need to fetch the profile now to update the frontend state.
      const profile = await fetchSellerProfile();
      if (profile) {
          console.log("Login successful (profile fetched).");
          return { success: true, seller: profile };
      } else {
          throw new Error("Login failed: Could not retrieve seller profile after OTP verification.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setSeller(null); // Ensure seller is null on failure
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Register function (assuming OTP flow where backend sets cookies)
  const register = async (phone) => {
    setLoading(true);
    try {
      // Use standard fetch, backend needs to set httpOnly cookies on success
      // and return seller data
      const response = await fetch(SELLER_AUTH_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }), // Send only phone, assuming OTP verified
        credentials: "include", // Send cookies, receive set-cookie
        mode: 'cors'
      });

      const data = await response.json();
      console.log("Register API response received");

      if (!response.ok) {
        console.error("Register API call failed:", data);
        throw new Error(data.message || "Registration failed");
      }

      // Backend sets cookies, frontend updates state from response body
      const sellerData = data.seller || data.data?.seller; // Adjust based on actual API response structure

      if (!sellerData) {
        console.error("No seller data found in register response");
        throw new Error("Invalid response format");
      }

      // No need to call setTokens - cookies are httpOnly
      setSeller(sellerData);
      console.log("Registration successful, seller state updated.");
      return { success: true, seller: sellerData, accessToken: data.accessToken }; // Return token only if explicitly needed by frontend (unlikely now)
    } catch (error) {
      console.error("Registration error:", error);
      setSeller(null);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      // Call backend logout endpoint to clear HttpOnly cookies
      await fetch(SELLER_AUTH_ENDPOINTS.LOGOUT, {
        method: "POST",
        credentials: "include", // Send existing cookies so backend can identify session
        mode: 'cors'
      });
      console.log("Logout API called.");
    } catch (error) {
      console.error("Logout API call error:", error);
      // Continue with client-side cleanup even if API fails
    } finally {
      // Clear local state regardless of API call success
      setSeller(null);
      setLoading(false);
      console.log("Seller state cleared.");
      // Optional: redirect or clear other sensitive frontend state
      // window.location.href = '/seller/signin'; // Example redirect
    }
  };

  // Function to update seller details locally and via API
  const updateSellerDetails = async (details) => {
    if (!seller) return { success: false, error: "Not authenticated" };
    
    setLoading(true);
    try {
      // Use authFetch to handle authentication and token refresh
      const updatedData = await authFetch(SELLER_AUTH_ENDPOINTS.UPDATE_DETAILS(seller.id), {
        method: "PUT",
        body: JSON.stringify(details),
      });

      if (updatedData && updatedData.seller) {
        // Update local state
        setSeller(updatedData.seller);
        console.log("Seller details updated successfully.");
        return { success: true, seller: updatedData.seller };
      } else {
         throw new Error(updatedData.message || "Failed to update seller details");
      }
    } catch (error) {
      console.error("Error updating seller details:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Send OTP (Seller)
  const sendSellerOTP = async (phone) => {
    console.log("Sending OTP to seller:", phone);
    try {
      const response = await fetch(SELLER_AUTH_ENDPOINTS.SEND_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        mode: 'cors'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to send OTP");
      console.log("Send OTP result:", result);
      return { success: true, ...result }; // Pass along any extra data like expiry
    } catch (error) {
      console.error("Send OTP error:", error);
      return { success: false, error: error.message };
    }
  };

  // Verify OTP (Seller)
  const verifySellerOTP = async (phone, otpCode) => {
     console.log("Verifying OTP for seller:", phone);
     try {
      const response = await fetch(SELLER_AUTH_ENDPOINTS.VERIFY_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode }),
        credentials: "include", // Important: Receive set-cookie headers if login occurs
        mode: 'cors'
      });
      const result = await response.json();
      console.log("Verify OTP response status:", response.status);
      console.log("Verify OTP result:", result);

      if (!response.ok) {
         // If verify fails (e.g., wrong code), throw error
         throw new Error(result.message || "Failed to verify OTP");
      }

      // If successful (200 OK), check the result payload
      // The backend now sets cookies if the user exists.
      if (result.success && result.verified) {
        if (!result.isNewSeller) {
           // Existing seller: Login was successful, cookies set by backend.
           // We need to fetch the profile to update frontend state.
           console.log("OTP verified for existing seller. Fetching profile...");
           await fetchSellerProfile(); // Update seller state
        } else {
           // New seller: Verification successful, but not logged in yet.
           // Registration step will handle login/cookie setting.
           console.log("OTP verified for new seller.");
        }
        // Return the result which might contain isNewSeller flag etc.
        return { success: true, verified: true, ...result };
      } else {
         // Should not happen if response.ok is true, but as a fallback
         throw new Error(result.message || "OTP Verification failed");
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      setSeller(null); // Clear seller state on verification failure
      return { success: false, error: error.message };
    }
  };


  const value = useMemo(() => ({
    seller,
    loading,
    isInitialized,
    login,
    register,
    logout,
    authFetch,
    updateSellerDetails,
    sendSellerOTP,
    verifySellerOTP,
    fetchCurrentSellerProfile: fetchSellerProfile
  }), [seller, loading, isInitialized, login, register, logout, authFetch, updateSellerDetails, sendSellerOTP, verifySellerOTP, fetchSellerProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
