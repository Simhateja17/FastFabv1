"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_URL, USER_ENDPOINTS } from "@/app/config";

const UserAuthContext = createContext();

export function UserAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Removed authStateChange as direct state update should trigger re-renders

  // Helper to update user state and persist non-sensitive data
  const updateUserState = useCallback((userData) => {
    console.log("Updating user state to:", userData);
    setUser(userData);
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
      console.log("Attempting user token refresh via API (using httpOnly cookie)");

      const response = await fetch(USER_ENDPOINTS.REFRESH_TOKEN, {
        method: "POST",
        headers: {
           // No Content-Type needed if no body is sent
           // No body needed as refresh token is expected in httpOnly cookie
        },
        // IMPORTANT: credentials must be 'include' for cookies to be sent
        credentials: "include", 
        mode: 'cors'
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({})); // Try to parse error
        const errorMessage = errorData.message || `Token refresh failed: ${response.status}`;
        console.error(
          "User token refresh failed:",
          response.status,
          errorMessage
        );
        // Don't clear state here, let authFetch handle it
        throw new Error(errorMessage);
      }

      // Successful refresh implies the backend set a new accessToken cookie
      console.log("User token refresh API call successful. New access token cookie should be set by backend.");
      return true; // Indicate success

    } catch (error) {
      console.error("User token refresh error:", error);
      throw error; // Re-throw for authFetch to handle
    }
  }, []); 

  // Create an authenticated fetch function that handles token refresh via cookies
  const userAuthFetch = useCallback(async (url, options = {}) => {
     const makeRequest = async (attempt = 1) => {
        console.log(`UserAuthFetch: Attempt ${attempt} to ${url}`);
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
             ...(options.body && !(options.body instanceof FormData) && {'Content-Type': 'application/json'}),
          },
          credentials: "include", // Crucial: Sends HttpOnly cookies
          mode: 'cors'
        });

        if (!response.ok) {
          if (response.status === 401 && attempt === 1) {
            console.log("UserAuthFetch: Received 401, attempting token refresh...");
            try {
              const refreshSuccess = await refreshAccessToken();
              if (refreshSuccess) {
                console.log("UserAuthFetch: Token refresh successful, retrying original request...");
                return await makeRequest(2); // Retry
              } else {
                 console.log("UserAuthFetch: Token refresh failed, cannot retry request.");
                 updateUserState(null); // Clear user state as auth is lost
                 throw new Error(`Unauthorized (401) - Refresh failed`);
              }
            } catch (refreshError) {
              console.error("UserAuthFetch: Error during token refresh:", refreshError);
              updateUserState(null); // Clear user state as refresh failed
              throw new Error(`Unauthorized (401) - Refresh error: ${refreshError.message}`);
            }
          } else {
            // Handle other non-OK responses or 401 on second attempt
            let errorMessage = `Request failed: ${response.status}`;
            try {
               const errorBody = await response.json();
               errorMessage = errorBody.message || errorMessage;
            } catch (e) { /* ignore if not json */ }
            console.error(`UserAuthFetch failed on attempt ${attempt}:`, errorMessage);
            // Don't clear user state on general server/network errors, only on definitive auth failure (handled above)
            throw new Error(errorMessage);
          }
        }

       // Handle successful response
       const contentType = response.headers.get("content-type");
       if (contentType && contentType.includes("application/json")) {
         return await response.json();
       } else {
         console.log(`UserAuthFetch: Received non-JSON response (${response.status})`);
         return { success: true, status: response.status }; // Or return text if needed
       }
     };
     
     return await makeRequest();
  }, [refreshAccessToken, updateUserState]);

  // Function to fetch the user profile (using userAuthFetch)
  const fetchUserProfile = useCallback(async () => {
    try {
      console.log("Fetching user profile using userAuthFetch...");
      // Use userAuthFetch which handles auth and refresh automatically
      const result = await userAuthFetch(USER_ENDPOINTS.PROFILE, { 
        method: "GET" 
      });

      // UserAuthFetch throws on failure, so if we get here, it was successful
      console.log("User profile fetched successfully (raw result):", result);
      
      // Handle potential nested user object in response
      const userData = result.user || result.data?.user || result.data;
      if (!userData || typeof userData !== 'object') {
         console.error("Invalid user data structure in profile response:", result);
         throw new Error("Invalid profile response structure");
      }
      return userData;

    } catch (error) {
      console.error("Error fetching user profile (likely auth failure or network issue):", error);
      // updateUserState(null); // Don't clear state here, authFetch handles auth errors
      throw error; // Re-throw for initializeAuth or component to handle
    }
  }, [userAuthFetch]);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    const initializeAuth = async () => {
      console.log("Initializing User Auth State...");
      setLoading(true); // Start loading
      try {
        // Check for persisted non-sensitive user data for quick UI update
        const savedUserData = localStorage.getItem("userData");
        if (savedUserData && isMounted) {
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
        console.log("Verifying user auth by fetching profile...");
        const freshUserData = await fetchUserProfile();
        console.log("User auth verified, user profile:", freshUserData);
        if (isMounted) {
          updateUserState(freshUserData); // Update with fresh data
        }

      } catch (error) {
        // If fetchUserProfile fails (e.g., due to invalid/expired refresh token after retry),
        // userAuthFetch or refreshAccessToken should have already cleared the user state.
        console.log("User Auth initialization failed or user not logged in:", error.message);
        if (isMounted) {
          updateUserState(null); // Ensure state is cleared if fetch failed
        }
      } finally {
        if (isMounted) {
           setLoading(false); // Stop loading
           console.log("User Auth initialization complete.");
        }
      }
    };

    initializeAuth();

    return () => { isMounted = false; }; // Cleanup function
    // Dependencies: fetchUserProfile and updateUserState ensure this runs correctly on change
  }, [fetchUserProfile, updateUserState]); // Run when these stable functions change (should be only once)

  // Login user (simplified - relies on backend setting cookies)
  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log("User login attempt for:", email);
      // Use standard fetch, backend needs to set httpOnly cookies on success
      const response = await fetch(USER_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Send potential existing cookies, backend will overwrite/set new ones
        mode: 'cors'
      });

      const data = await response.json();
      console.log("User login API response received");

      if (!response.ok) {
        console.error("User login API call failed:", data);
        throw new Error(data.message || "Login failed");
      }
      
      // Backend is responsible for setting cookies.
      // Frontend just needs the user data from the response body.
      const userData = data.user || data.data?.user || data.data;

      if (!userData) {
        console.error("No user data found in login response");
        throw new Error("Invalid response format");
      }

      // No need to handle tokens client-side
      updateUserState(userData); // Update frontend state
      console.log("User login successful, user state updated.");

      // Set flag for location modal (optional)
      localStorage.setItem("justLoggedIn", "true");

      return { success: true, user: userData };
    } catch (error) {
      console.error("User login error:", error);
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
        credentials: "include", // Important for receiving cookies if backend auto-logins
        mode: 'cors'
      });

      const result = await response.json();
      console.log("User registration API response received");

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }
      
      // Backend handles cookie setting if user is auto-logged in.
      // Frontend updates state based on response body.
      const user = result.user || result.data?.user || result.data;
      const loggedIn = result.accessToken || result.tokens?.accessToken || result.data?.tokens?.accessToken; // Check if tokens were returned (indicating auto-login)

      if (loggedIn && user) {
        console.log("User registration successful, user auto-logged in.");
        updateUserState(user);
        // Set flag for location modal (optional)
        localStorage.setItem("justLoggedIn", "true");
      } else {
         console.log("User registration successful, user needs to log in separately or backend didn't auto-login.");
         // Don't set user state if not logged in
      }
            
      return { success: true, user: user }; // Return user data if available
    } catch (error) {
      console.error("User registration error:", error);
      updateUserState(null); // Ensure user state is null on registration failure
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    setLoading(true);
    console.log("Logging out user...");
    try {
      // Call backend logout endpoint to clear HttpOnly cookies
      await fetch(USER_ENDPOINTS.LOGOUT, {
        method: "POST",
        credentials: "include", // Send existing cookies so backend can identify session
        mode: 'cors'
      });
      console.log("User logout API called.");
    } catch (error) {
      console.error("User logout API call error:", error);
      // Continue with client-side cleanup even if API fails
    } finally {
       // Clear local state regardless of API call success
      updateUserState(null);
      setLoading(false);
      console.log("User state cleared.");
      // Optional: redirect or clear other sensitive frontend state
      // window.location.href = '/login'; // Example redirect
    }
  };

  // Update user profile
  const updateUserProfile = async (profileData) => {
    try {
      setLoading(true);
      console.log("Updating user profile with:", profileData);
      // Use userAuthFetch to handle auth
      const result = await userAuthFetch(USER_ENDPOINTS.UPDATE_PROFILE, { 
        method: "PUT",
        body: JSON.stringify(profileData)
      });
      
      // userAuthFetch throws on error, so we assume success here
      console.log("User profile update successful (raw result):", result);
      const updatedUserData = result.user || result.data?.user || result.data;
       if (!updatedUserData || typeof updatedUserData !== 'object') {
         console.error("Invalid user data structure in update profile response:", result);
         throw new Error("Invalid profile update response structure");
      }
      
      updateUserState(updatedUserData); // Update state with new data
      return { success: true, user: updatedUserData };
    } catch (error) {
      console.error("Error updating user profile:", error);
      // State is likely already cleared if it was an auth error
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Send WhatsApp OTP for user verification/login
  const sendWhatsAppOTP = async (phoneNumber) => {
     console.log("Sending User WhatsApp OTP to:", phoneNumber);
     try {
      const response = await fetch(USER_ENDPOINTS.PHONE_AUTH_START, { // Use correct user endpoint: PHONE_AUTH_START
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
        mode: 'cors'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to send OTP');
      console.log("Send User OTP result:", result);
      return { success: true, ...result }; // Pass along expiry etc.
    } catch (error) {
      console.error("Send User OTP error:", error);
      return { success: false, error: error.message };
    }
  };

  // Verify WhatsApp OTP for user
  const verifyWhatsAppOTP = async (phoneNumber, otpCode) => {
    console.log("Verifying User OTP for phone:", phoneNumber);
    try {
      const response = await fetch(USER_ENDPOINTS.PHONE_AUTH_VERIFY, { // Use correct user endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: otpCode }),
        credentials: "include", // Important: To receive set-cookie headers
        mode: 'cors'
      });
      const result = await response.json();
      console.log("Verify User OTP response status:", response.status);
      console.log("Verify User OTP result:", result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify OTP');
      }

      // If verification is successful and backend logs in user, cookies are set.
      if (result.success && result.verified && !result.isNewUser) {
         // Existing user: Login successful, cookies set by backend.
         // Fetch profile to update frontend state.
         console.log("OTP verified for existing user. Fetching profile...");
         try {
           const userData = await fetchUserProfile();
           updateUserState(userData); // Update user state
           localStorage.setItem("justLoggedIn", "true"); // Set flag if needed
           console.log("User OTP verified, logged in, profile fetched.");
           return { success: true, verified: true, isNewUser: false, user: userData };
         } catch (profileError) {
             console.error("User OTP verified, but failed to fetch profile:", profileError);
              return { success: true, verified: true, isNewUser: false, user: null, error: 'Failed to fetch profile post-verification' };
         }
      } else if (result.success && result.verified && result.isNewUser) {
         // New user: Verification successful, not logged in yet.
         console.log("OTP verified for new user.");
         return { success: true, verified: true, isNewUser: true, user: null };
      } else {
        // Should not happen if response.ok, but as a fallback
        throw new Error(result.message || "OTP Verification failed unexpectedly");
      }
    } catch (error) {
      console.error("Verify User OTP error:", error);
      updateUserState(null); // Clear user state on verification failure
      return { success: false, error: error.message };
    }
  };

  // Register user specifically after phone verification
  const registerWithPhone = async (newUserData) => {
    // This function assumes OTP was already verified and isNewUser was true
    try {
      setLoading(true);
      console.log("Registering user with verified phone:", newUserData.phone);
      const response = await fetch(USER_ENDPOINTS.REGISTER, { // Use the main register endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUserData, 
          isPhoneVerified: true // Explicitly set based on flow
        }),
        credentials: "include", // Important: To receive set-cookie headers if auto-login occurs
        mode: 'cors'
      });
      const result = await response.json();
      console.log("Register with phone API response:", result);

      if (!response.ok) throw new Error(result.message || 'Registration failed');

       // If registration results in login, cookies are set by backend
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

  return (
    <UserAuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
        sendWhatsAppOTP,
        verifyWhatsAppOTP,
        registerWithPhone,
        userAuthFetch // Expose authFetch if needed by components
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export const useUserAuth = () => useContext(UserAuthContext);
