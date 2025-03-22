"use client";

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Create context
const AdminAuthContext = createContext();

// Hardcoded admin credentials
const ADMIN_EMAIL = "simhateja@fastandfab.in";
const ADMIN_PASSWORD = "FabandFast@963258741";

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
      // Check against hardcoded credentials
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const adminUserData = {
          email: ADMIN_EMAIL,
          name: "Admin",
          role: "SUPER_ADMIN",
          isAuthenticated: true,
        };

        // Store in local storage
        localStorage.setItem("adminUser", JSON.stringify(adminUserData));
        setAdminUser(adminUserData);
        return { success: true };
      } else {
        throw new Error("Invalid email or password");
      }
    } catch (err) {
      setError(err.message || "Login failed");
      return { success: false, error: err.message || "Login failed" };
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
