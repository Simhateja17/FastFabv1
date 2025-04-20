"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_URL, USER_ENDPOINTS } from "@/app/config";

const UserAuthContext = createContext();

export function UserAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStateChange, setAuthStateChange] = useState(0);

  // Helper to update both user state and trigger state change
  const updateUserState = useCallback((userData) => {
    console.log("Updating user state to:", userData);
    setUser(userData);
    setAuthStateChange((prev) => prev + 1); // Increment to force context consumers to re-render
    // Persist user data to localStorage for non-sensitive UI state
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    } else {
      localStorage.removeItem("userData");
    }
  }, []);

  // Refresh the access token using the refresh token cookie
  const refreshAccessToken = useCallback(async () => {
    try {
      // No need to get refresh token from localStorage anymore
      console.log("Attempting token refresh via API (using httpOnly cookie)");

      const response = await fetch(USER_ENDPOINTS.REFRESH_TOKEN, {
        method: "POST",
        headers: {
           // No Content-Type needed if no body is sent
           // No body needed as refresh token is expected in httpOnly cookie
        },
        // IMPORTANT: credentials must be 'include' for cookies to be sent
        credentials: "include", 
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({})); // Try to parse error
        console.error(
          "Token refresh failed:",
          response.status,
          response.statusText,
          errorData
        );
        throw new Error(errorData.message || "Failed to refresh token");
      }

      // Successful refresh implies the backend set a new accessToken cookie
      console.log("Token refresh API call successful. New access token cookie should be set by backend.");
      
      // Optionally, the refresh endpoint *could* return the new expiry or user data if needed
      // const result = await response.json(); 
      // console.log("Token refresh response:", result); 

      return true; // Indicate success

    } catch (error) {
      console.error("Token refresh error:", error);
      // Don't necessarily clear user state here immediately,
      // let the next authFetch handle the persistent failure.
      // updateUserState(null); // Avoid immediate logout on refresh failure
      throw error; // Re-throw for authFetch to handle
    }
  }, []); // Removed updateUserState dependency as it's not clearing state here

  // Create an authenticated fetch function that handles token refresh via cookies
  const userAuthFetch = useCallback(async (url, options = {}) => {
    // Set up headers (Content-Type is common, others as needed)
    const headers = {
      ...options.headers,
      "Content-Type": "application/json", // Keep for POST/PUT etc.
    };
    
    // REMOVE manual Authorization header - rely on browser sending cookies
    // if (accessToken) { headers.Authorization = `Bearer ${accessToken}`; }

    try {
      // First attempt - browser automatically sends cookies
      console.log(`AuthFetch: Attempting fetch to ${url} (credentials: include)`);
      const response = await fetch(url, {
        ...options,
        headers,
        // IMPORTANT: credentials must be 'include' for cookies to be sent
        credentials: "include", 
      });

      // If unauthorized, try to refresh
      if (response.status === 401) {
         console.log(`AuthFetch: Received 401 from ${url}. Attempting token refresh.`);
        try {
          // Try to refresh the token via API call
          await refreshAccessToken();
          console.log(`AuthFetch: Token refresh successful. Retrying fetch to ${url}.`);

          // Retry the request - browser should now send the new accessToken cookie
          return fetch(url, {
            ...options,
            headers, // Headers remain the same (no manual Bearer token)
            credentials: "include",
          });
        } catch (refreshError) {
          // If refresh fails, this likely means the refresh token is also invalid/expired
          console.error(
            "AuthFetch: Token refresh failed during retry, logging out:",
            refreshError
          );
          // Clear user state ONLY if refresh fails definitively
          updateUserState(null); 
          // Optionally, trigger a redirect to login here or let the calling component handle it
          throw refreshError; // Re-throw the refresh error
        }
      }

      // If not 401, return the original response
      return response;

    } catch (error) {
       // Catch network errors or other fetch issues
      console.error(`AuthFetch: Error during fetch to ${url}:`, error);
      // Don't clear auth state on general network errors
      throw error;
    }
  }, [refreshAccessToken, updateUserState]);

  // Function to fetch the user profile (using userAuthFetch)
  const fetchUserProfile = useCallback(async () => {
    try {
      console.log("Fetching user profile using userAuthFetch...");
      // Use userAuthFetch which handles auth and refresh automatically
      const response = await userAuthFetch(USER_ENDPOINTS.PROFILE, { 
        method: "GET" 
      });

      if (!response.ok) {
        // userAuthFetch handles 401, so other errors are more critical
        const errorData = await response.json().catch(() => ({}));
        console.error("Profile fetch failed:", response.status, errorData);
        throw new Error(errorData.message || `Profile fetch failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("User profile fetched successfully:", result);
      
      // Handle potential nested user object in response
      const userData = result.user || result.data?.user || result.data;
      if (!userData || typeof userData !== 'object') {
         console.error("Invalid user data structure in profile response:", result);
         throw new Error("Invalid profile response structure");
      }
      return userData;

    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Don't clear state here, let authFetch handle auth errors
      // updateUserState(null); 
      throw error; // Re-throw for initializeAuth or component to handle
    }
  }, [userAuthFetch]);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log("Initializing auth state...");
      setLoading(true); // Start loading
      try {
        // Check for persisted non-sensitive user data for quick UI update
        const savedUserData = localStorage.getItem("userData");
        if (savedUserData) {
          try {
            const parsedUserData = JSON.parse(savedUserData);
            console.log("Using saved user data temporarily:", parsedUserData);
            setUser(parsedUserData); // Set temporary user state
          } catch (e) {
            console.error("Error parsing saved user data:", e);
            localStorage.removeItem("userData"); // Clear invalid data
          }
        }

        // Verify auth status by fetching user profile
        console.log("Verifying auth by fetching profile...");
        const userData = await fetchUserProfile();
        console.log("Auth verified, user profile:", userData);
        updateUserState(userData); // Update with fresh data

      } catch (error) {
        // If fetchUserProfile fails (e.g., due to invalid/expired refresh token after retry),
        // userAuthFetch or refreshAccessToken should have already cleared the user state.
        console.log("Auth initialization failed or user not logged in:", error.message);
        // Ensure state is cleared if fetchUserProfile failed after potential local storage load
        if (user !== null) { 
          updateUserState(null);
        }
      } finally {
        setLoading(false); // Stop loading
        console.log("Auth initialization complete.");
      }
    };

    initializeAuth();
    // Dependencies: fetchUserProfile and updateUserState ensure this runs correctly on change
  }, [fetchUserProfile, updateUserState]); 

  // Login user (simplified - relies on backend setting cookies)
  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log("Login attempt for:", email);
      // Use standard fetch, backend needs to set httpOnly cookies on success
      const response = await fetch(USER_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Send potential existing cookies, backend will overwrite/set new ones
      });

      const data = await response.json();
      console.log("Login API response received");

      if (!response.ok) {
        console.error("Login API call failed:", data);
        throw new Error(data.message || "Login failed");
      }
      
      // Backend is responsible for setting cookies.
      // Frontend just needs the user data from the response body.
      const userData = data.user || data.data?.user || data.data;

      if (!userData) {
        console.error("No user data found in login response");
        throw new Error("Invalid response format");
      }

      // No need to call setUserTokens - cookies are httpOnly
      // setUserTokens(accessToken, refreshToken); 
      
      updateUserState(userData); // Update frontend state
      console.log("Login successful, user state updated.");

      // Set flag for location modal (optional)
      localStorage.setItem("justLoggedIn", "true");

      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error);
      // Ensure user state is null on login failure
      updateUserState(null); 
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Register new user (simplified - relies on backend setting cookies)
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await fetch(USER_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
        credentials: "include", 
      });

      const result = await response.json();
      console.log("Registration API response received");

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }
      
      // Backend handles cookie setting if user is auto-logged in.
      // Frontend updates state based on response body.
      const user = result.user || result.data?.user || result.data;
      const loggedIn = result.accessToken || result.tokens?.accessToken || result.data?.tokens?.accessToken; // Check if tokens were returned (indicating auto-login)

      if (loggedIn && user) {
        console.log("Registration successful, user auto-logged in.");
        updateUserState(user);
        // Set flag for location modal (optional)
        localStorage.setItem("justLoggedIn", "true");
      } else {
         console.log("Registration successful, user needs to log in separately or backend didn't auto-login.");
         // Don't set user state if not logged in
      }
      
      // No need to call setUserTokens
      
      return { success: true, user: user }; // Return user data if available
    } catch (error) {
      console.error("Registration error:", error);
      updateUserState(null); // Ensure user state is null on registration failure
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout user (relies on backend clearing cookies)
  const logout = async () => {
    try {
      console.log("Logging out user via API call...");
      // Call backend logout endpoint to invalidate session and clear cookies
      await fetch(USER_ENDPOINTS.LOGOUT, {
        method: "POST",
        credentials: "include", // Send cookies to be cleared
      }).catch((error) => console.error("Logout API call error (ignoring):", error)); // Log error but proceed
      
    } catch (error) {
      // Should not happen with the catch above, but just in case
      console.error("Unexpected logout error:", error);
    } finally {
      // Clear frontend state regardless of API success
      updateUserState(null); 
      console.log("Frontend user state cleared after logout attempt.");
      
      // Redirect to home page after logout attempt
      window.location.href = "/"; 
    }
  };

  // Update user profile (using userAuthFetch)
  const updateUserProfile = async (userData) => {
     try {
      // Use userAuthFetch for authenticated request
      const response = await userAuthFetch(USER_ENDPOINTS.UPDATE_PROFILE, {
        method: "PUT", // Or PATCH depending on your API design
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
      }

      const result = await response.json();
      console.log("Profile update response:", result);

      // Extract updated user data
      const updatedUserData = result.user || result.data?.user || result.data;
      if (!updatedUserData) {
          throw new Error("Invalid profile update response structure");
      }

      updateUserState(updatedUserData); // Update context state

      return { success: true, user: updatedUserData };
    } catch (error) {
       console.error("Update profile error:", error);
      return { success: false, error: error.message };
    }
  };

  // --- WhatsApp OTP Functions (Need Review based on Cookie Auth) ---
  // These likely need adjustment if the backend OTP endpoints also rely on cookies vs. tokens in body

  const sendWhatsAppOTP = async (phoneNumber) => {
    // ... (Existing implementation - review if USER_ENDPOINTS.PHONE_AUTH_START needs auth cookie)
     try {
      setLoading(true);
      const response = await fetch(USER_ENDPOINTS.PHONE_AUTH_START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
         // Check if this endpoint requires credentials (cookies)
        // credentials: "include", 
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to send OTP');
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyWhatsAppOTP = async (phoneNumber, otpCode) => {
    // ... (Existing implementation - review if USER_ENDPOINTS.PHONE_AUTH_VERIFY needs auth cookie)
    // This endpoint likely SETS auth cookies on success, so credentials: "include" is important
     try {
      setLoading(true);
      const response = await fetch(USER_ENDPOINTS.PHONE_AUTH_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: otpCode }),
        credentials: "include", // Important: To receive set-cookie headers
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to verify OTP');

       // If verification is successful and backend logs in user, cookies are set.
       // Update frontend state based on response.
      if (result.success && result.verified && !result.isNewUser) {
         // Attempt to fetch profile to confirm login and get user data
         try {
             const userData = await fetchUserProfile();
             updateUserState(userData);
             localStorage.setItem("justLoggedIn", "true"); // Set flag if needed
             console.log("OTP verified, user logged in, profile fetched.");
             return { success: true, verified: true, isNewUser: false, user: userData };
         } catch (profileError) {
             console.error("OTP verified, but failed to fetch profile:", profileError);
              // User might be logged in (cookies set), but profile fetch failed.
              // Return success but indicate potential issue.
              return { success: true, verified: true, isNewUser: false, user: null, error: 'Failed to fetch profile post-verification' };
         }
      } else if (result.success && result.verified && result.isNewUser) {
         // Handle new user case - no login, no cookies set yet.
         console.log("OTP verified, new user detected.");
         updateUserState(null); // Ensure no stale user state
         return { success: true, verified: true, isNewUser: true };
      } else {
          // Handle other verification failure cases
          updateUserState(null); // Ensure no stale user state
          return { success: result.success !== undefined ? result.success : false, verified: false, isNewUser: false, message: result.message };
      }
    } catch (error) {
      updateUserState(null); // Ensure no stale user state
      return { success: false, verified: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const registerWithPhone = async (userData) => {
    // ... (Existing implementation - review if USER_ENDPOINTS.REGISTER needs cookies)
    // This endpoint likely SETS auth cookies on success if auto-login happens
    try {
      setLoading(true);
      const response = await fetch(USER_ENDPOINTS.REGISTER, { // Assuming REGISTER endpoint is used
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        credentials: "include", // Important: To receive set-cookie headers if auto-login occurs
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Registration failed');

       // If registration results in login, cookies are set by backend
       // Update frontend state based on response
      const user = result.user || result.data?.user || result.data;
       const loggedIn = result.accessToken || result.tokens?.accessToken || result.data?.tokens?.accessToken; 

      if (loggedIn && user) {
        console.log("Phone registration successful, user auto-logged in.");
         updateUserState(user);
         localStorage.setItem("justLoggedIn", "true"); // Set flag if needed
      } else {
         console.log("Phone registration successful, user may need to log in separately.");
         // Don't set user state if not logged in
      }

      return { success: true, user: user }; // Return user data if available
    } catch (error) {
       console.error("Phone registration error:", error);
       updateUserState(null); // Ensure user state is null on failure
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Value provided to the context consumers
  const value = {
    user,
    loading,
    authStateChange, // Provide this if components need to react to auth changes explicitly
    userAuthFetch,
    login,
    register,
    logout,
    updateUserProfile,
    sendWhatsAppOTP,
    verifyWhatsAppOTP,
    registerWithPhone,
    // fetchUserProfile, // Expose if needed directly by components
  };

  return (
    <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>
  );
}

export const useUserAuth = () => useContext(UserAuthContext);
