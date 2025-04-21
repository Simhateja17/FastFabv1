"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    // Simple check for new registration
    const isNewRegistration =
      localStorage.getItem("isNewRegistration") === "true";

    const checkAuth = async () => {
      console.log("ProtectedRoute: Checking authorization");
      console.log("Current seller state:", seller);

      // Not authenticated
      if (!seller) {
        console.log("Not authenticated, redirecting to login");
        router.push("/seller/signin");
        return;
      }

      // Special case for new registrations
      if (isNewRegistration && seller) {
        console.log("New registration detected, redirecting to onboarding");
        localStorage.removeItem("isNewRegistration"); // Clear the flag

        if (window.location.pathname !== "/seller/onboarding") {
          router.push("/seller/onboarding");
          return;
        }
      }

      // Authenticated but needs onboarding
      if (seller.needsOnboarding) {
        if (window.location.pathname !== "/seller/onboarding") {
          console.log("Needs onboarding, redirecting to onboarding page");
          router.push("/seller/onboarding");
          return;
        }
      }
      // Authenticated and onboarded, but on onboarding page
      else if (window.location.pathname === "/seller/onboarding") {
        console.log("Already onboarded, redirecting to dashboard");
        router.push("/seller/dashboard");
        return;
      }

      // If we require onboarding to be completed and it's not
      if (requireOnboarding && seller.needsOnboarding) {
        console.log("Onboarding required but not completed, redirecting");
        router.push("/seller/onboarding");
        return;
      }

      // All checks passed
      setIsAuthorized(true);
      setIsChecking(false);
    };

    if (!loading) {
      checkAuth();
    }
  }, [seller, loading, router, requireOnboarding]);

  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Render children only if authorized, passing the confirmed seller object
  // Allow children to be a function that receives the seller
  return isAuthorized ? 
    (typeof children === 'function' ? children(seller) : children) 
    : null;
};

export default ProtectedRoute;
