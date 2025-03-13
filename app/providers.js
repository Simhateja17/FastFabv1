"use client";

import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { UserAuthProvider } from "./context/UserAuthContext";

export function Providers({ children }) {
  return (
    <AuthProvider>
      <UserAuthProvider>
        {children}
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 5000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              style: {
                background: "#22c55e",
                color: "#fff",
              },
            },
            error: {
              duration: 5000,
              style: {
                background: "#ef4444",
                color: "#fff",
              },
            },
          }}
        />
      </UserAuthProvider>
    </AuthProvider>
  );
}
