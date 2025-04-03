"use client";

import { useEffect, useState } from 'react';
import { Toaster } from "react-hot-toast";

/**
 * Global Providers component that wraps all client-side providers
 * 
 * This component:
 * 1. Handles client-side hydration in Next.js
 * 2. Ensures Zustand stores are properly hydrated before rendering
 * 3. Prevents hydration mismatch errors
 */
// Using named export to match imports
export function Providers({ children }) {
  // State to track hydration
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration to complete before rendering
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // In development mode, ensure location store is initialized
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      try {
        import('./lib/locationStore')
          .then(() => console.log('Location store initialized'))
          .catch(err => console.error('Failed to initialize location store:', err));
      } catch (err) {
        console.error('Error importing location store:', err);
      }
    }
  }, []);

  // During SSR and initial client render
  if (!isHydrated) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  // Once hydrated on the client
  return (
    <>
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
    </>
  );
}

// Also export as default for ESM imports
export default Providers;
