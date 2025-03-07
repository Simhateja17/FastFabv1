"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { seller, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !seller) {
      router.push("/seller/signin");
    }
  }, [seller, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B6E5A]"></div>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  return children;
}
