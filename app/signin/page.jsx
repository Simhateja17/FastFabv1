"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to signup page
    router.push("/signup");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
