"use client";

import { createContext, useContext, useState } from "react";
import { API_URL } from "@/app/config";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (phone, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store the token
      localStorage.setItem("token", data.token);
      setSeller({ id: data.sellerId });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (phone, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Store the token
      localStorage.setItem("token", data.token);
      setSeller({ id: data.sellerId });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateSellerDetails = async (sellerId, details) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_URL}/auth/${sellerId}/details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(details),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update seller details");
      }

      setSeller(data.seller);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setSeller(null);
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return false;
      }

      // Since there's no specific verify endpoint in auth.routes.js,
      // we can try to get seller details to verify the token
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      const data = await response.json();
      setSeller(data.seller);
      return true;
    } catch (error) {
      localStorage.removeItem("token");
      setSeller(null);
      return false;
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
        checkAuth,
        updateSellerDetails,
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
