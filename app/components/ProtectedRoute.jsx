"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "react-hot-toast";

/**
 * A higher-order component that protects routes requiring authentication
 * and completed onboarding.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The components to render if authenticated
 * @param {boolean} props.requireOnboarding - Whether to require completed onboarding
 */
export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const router = useRouter();
  const { seller, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  // Add a ref to track if we're already redirecting to prevent multiple redirects
  const redirectingRef = useRef(false);
  // Add a ref to track the last auth check time
  const lastAuthCheckRef = useRef(0);

  useEffect(() => {
    // If still loading auth state, wait
    if (loading) return;

    // Prevent multiple redirects
    if (redirectingRef.current) return;

    // Debounce auth checks - only check once every 2 seconds
    const now = Date.now();
    if (now - lastAuthCheckRef.current < 2000) {
      console.log("Auth check debounced, skipping");
      return;
    }
    lastAuthCheckRef.current = now;

    console.log("ProtectedRoute check:", { seller, requireOnboarding });

    // If not authenticated, redirect to login
    if (!seller) {
      console.log("Not authenticated, redirecting to signin");
      redirectingRef.current = true;

      // Store the redirect in localStorage to prevent future redirects
      localStorage.setItem(
        "lastRedirect",
        JSON.stringify({
          time: Date.now(),
          path: "/seller/signin",
        })
      );

      toast.error("Please sign in to access this page");
      router.push("/seller/signin");
      return;
    }

    // If onboarding is required but not completed, redirect to onboarding
    if (requireOnboarding && seller.needsOnboarding) {
      console.log("Onboarding required but not completed, redirecting");
      redirectingRef.current = true;

      // Store the redirect in localStorage to prevent future redirects
      localStorage.setItem(
        "lastRedirect",
        JSON.stringify({
          time: Date.now(),
          path: "/seller/onboarding",
        })
      );

      toast.error("Please complete your profile setup first");
      router.push("/seller/onboarding");
      return;
    }

    // User is authorized to view the page
    setIsAuthorized(true);
  }, [seller, loading, router, requireOnboarding]);

  // Check for recent redirects on mount
  useEffect(() => {
    const lastRedirectStr = localStorage.getItem("lastRedirect");
    if (lastRedirectStr) {
      try {
        const lastRedirect = JSON.parse(lastRedirectStr);
        const now = Date.now();

        // If we redirected in the last 5 seconds, don't check auth again
        if (now - lastRedirect.time < 5000) {
          console.log("Recent redirect detected, skipping auth check");
          redirectingRef.current = true;
        } else {
          // Clear old redirect data
          localStorage.removeItem("lastRedirect");
        }
      } catch (e) {
        console.error("Error parsing last redirect:", e);
        localStorage.removeItem("lastRedirect");
      }
    }
  }, []);

  // Show loading state while checking authorization
  if (loading || !isAuthorized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render children if authorized
  return <>{children}</>;
}
