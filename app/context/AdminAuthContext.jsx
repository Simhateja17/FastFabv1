"use client";

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiClient";

// Create context
const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("adminUser");
    if (storedUser) {
      try {
        setAdminUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Error parsing stored admin user:", err);
        localStorage.removeItem("adminUser");
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Make API call to backend for authentication
      const response = await axios.post(`${API_BASE_URL}/api/admin/login`, {
        email,
        password,
      });

      if (response.data && response.data.accessToken) {
        // Create admin user data with token
        const adminUserData = {
          email: email,
          name: response.data.admin?.name || "Admin",
          role: response.data.admin?.role || "SUPER_ADMIN",
          isAuthenticated: true,
          token: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        };

        // Store in local storage
        localStorage.setItem("adminUser", JSON.stringify(adminUserData));
        console.log("Admin token stored:", response.data.accessToken);
        setAdminUser(adminUserData);

        return { success: true };
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Login failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("adminUser");
    setAdminUser(null);
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!adminUser;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        loading,
        error,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
