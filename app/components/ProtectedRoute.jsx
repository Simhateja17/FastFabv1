"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    // If still loading auth state, wait
    if (loading) return;

    console.log("ProtectedRoute check:", { seller, requireOnboarding });

    // If not authenticated, redirect to login
    if (!seller) {
      console.log("Not authenticated, redirecting to signin");
      toast.error("Please sign in to access this page");
      router.push("/seller/signin");
      return;
    }

    // If onboarding is required but not completed, redirect to onboarding
    if (requireOnboarding && seller.needsOnboarding) {
      console.log("Onboarding required but not completed, redirecting");
      toast.error("Please complete your profile setup first");
      router.push("/seller/onboarding");
      return;
    }

    // User is authorized to view the page
    setIsAuthorized(true);
  }, [seller, loading, router, requireOnboarding]);

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
