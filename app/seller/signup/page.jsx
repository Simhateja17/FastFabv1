"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function SellerSignup() {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register, seller } = useAuth();
  // Use a ref to track if we're already redirecting
  const isRedirectingRef = useRef(false);
  // Use a ref to track if the component is mounted
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    // If already redirecting or not mounted, skip
    if (isRedirectingRef.current || !isMountedRef.current) return;

    console.log("Seller state in signup:", seller);

    if (seller) {
      isRedirectingRef.current = true;

      // Store the redirect in localStorage to prevent future redirects
      const redirectPath = seller.needsOnboarding
        ? "/seller/onboarding"
        : "/seller/dashboard";
      localStorage.setItem(
        "lastRedirect",
        JSON.stringify({
          time: Date.now(),
          path: redirectPath,
        })
      );

      if (seller.needsOnboarding) {
        console.log("Redirecting to onboarding");
        router.push("/seller/onboarding");
      } else {
        console.log("Redirecting to dashboard");
        router.push("/seller/dashboard");
      }
    }
  }, [seller, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // Only allow numbers and limit to 10 digits
      const numericValue = value.replace(/[^0-9]/g, "");
      if (numericValue.length <= 10) {
        setFormData((prev) => ({ ...prev, [name]: numericValue }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("Registering with:", formData.phone);
      const result = await register(formData.phone, formData.password);
      console.log("Registration result:", result);

      if (result.success) {
        toast.success("Registration successful!");

        // Prevent multiple redirects
        if (isRedirectingRef.current || !isMountedRef.current) {
          return;
        }
        isRedirectingRef.current = true;

        // Store the redirect in localStorage
        const redirectPath = result.needsOnboarding
          ? "/seller/onboarding"
          : "/seller/dashboard";
        localStorage.setItem(
          "lastRedirect",
          JSON.stringify({
            time: Date.now(),
            path: redirectPath,
          })
        );

        // Check if we need onboarding
        if (result.needsOnboarding) {
          console.log("Redirecting to onboarding after signup");
          router.push("/seller/onboarding");
        } else {
          console.log("Redirecting to dashboard after signup");
          router.push("/seller/dashboard");
        }
      } else {
        toast.error(result.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Image
            src="/logo.svg"
            alt="Fast&Fab Logo"
            width={200}
            height={60}
            className="mx-auto mb-6"
          />
          <h1 className="text-xl font-medium text-text-dark">
            Become a Seller
          </h1>
        </div>

        <div className="bg-background-card p-8 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-text mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text mb-1"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-secondary text-primary py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || formData.phone.length !== 10}
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>

            <div className="text-center text-sm text-text-muted">
              Already have an account?{" "}
              <Link
                href="/seller/signin"
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
