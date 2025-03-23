"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useUserAuth } from "@/app/context/UserAuthContext";

export default function SignIn() {
  const router = useRouter();
  const { login, loading: authLoading, user } = useUserAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  console.log("SignIn component rendered - Auth state:", { user, authLoading });

  // Check if user is already logged in
  useEffect(() => {
    console.log("SignIn useEffect - Checking if user is logged in:", user);
    if (user) {
      console.log("User already logged in, redirecting to home");
      router.push("/");
    }
  }, [user, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Login form submitted for:", formData.email);

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      console.log("Email validation failed");
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      console.log("Password validation failed");
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    console.log("Starting login process...");

    try {
      console.log("Calling login function with email:", formData.email);
      const result = await login(formData.email, formData.password);
      console.log("Login result:", result);

      if (result.success) {
        console.log("Login successful, user:", result.user);
        toast.success("Sign in successful!");
        console.log("Redirecting to home page...");
        router.push("/");
      } else {
        console.error("Login failed:", result.error);
        toast.error(
          result.error || "Login failed. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("Unexpected error during login:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      console.log("Login process completed");
      setLoading(false);
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
            Login to your account
          </h1>
        </div>

        <div className="bg-background-card p-8 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-dark mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-dark mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-secondary focus:ring-secondary border-ui-border rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-text"
                >
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-secondary text-primary py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || authLoading ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center text-sm text-text-muted">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
