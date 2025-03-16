"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

/**
 * A higher-order component that protects routes requiring authentication
 * and completed onboarding.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The components to render if authenticated
 * @param {boolean} props.requireOnboarding - Whether to require completed onboarding
 */
const ProtectedRoute = ({ children, requireOnboarding = false }) => {
  const { seller, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const lastRedirectRef = useRef(0);

  useEffect(() => {
    // Prevent redirect loops by checking when the last redirect happened
    const now = Date.now();
    const lastRedirect = localStorage.getItem("lastAuthRedirect")
      ? parseInt(localStorage.getItem("lastAuthRedirect"))
      : 0;

    // If we redirected in the last 2 seconds, don't redirect again
    if (now - lastRedirect < 2000) {
      console.log("Preventing redirect loop - last redirect was too recent");
      setIsChecking(false);
      return;
    }

    const checkAuthorization = async () => {
      try {
        console.log("ProtectedRoute: Checking authorization");
        console.log("Current seller state:", seller);
        console.log("Loading state:", loading);
        console.log("requireOnboarding:", requireOnboarding);

        // Check if this is a new registration
        const isNewRegistration =
          localStorage.getItem("isNewRegistration") === "true";

        if (isNewRegistration && seller?.needsOnboarding) {
          console.log("New registration detected, redirecting to onboarding");
          localStorage.removeItem("isNewRegistration"); // Clear the flag
          localStorage.setItem("lastAuthRedirect", now.toString());
          router.push("/seller/onboarding");
          return;
        }

        // Not authenticated
        if (!seller) {
          console.log("Not authenticated, redirecting to login");
          localStorage.setItem("lastAuthRedirect", now.toString());
          router.push("/seller/signin");
          return;
        }

        // Authenticated but needs onboarding
        if (seller.needsOnboarding) {
          if (window.location.pathname !== "/seller/onboarding") {
            console.log("Needs onboarding, redirecting to onboarding page");
            localStorage.setItem("lastAuthRedirect", now.toString());
            router.push("/seller/onboarding");
            return;
          }
        }
        // Authenticated and onboarded, but on onboarding page
        else if (window.location.pathname === "/seller/onboarding") {
          console.log("Already onboarded, redirecting to dashboard");
          localStorage.setItem("lastAuthRedirect", now.toString());
          router.push("/seller/dashboard");
          return;
        }

        // If we require onboarding to be completed and it's not
        if (requireOnboarding && seller.needsOnboarding) {
          console.log("Onboarding required but not completed, redirecting");
          localStorage.setItem("lastAuthRedirect", now.toString());
          router.push("/seller/onboarding");
          return;
        }

        // All checks passed
        setIsAuthorized(true);
      } catch (error) {
        console.error("Authorization check error:", error);
      } finally {
        setIsChecking(false);
      }
    };

    if (!loading) {
      checkAuthorization();
    }
  }, [seller, loading, router, requireOnboarding]);

  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return isAuthorized ? children : null;
};

export default ProtectedRoute;
