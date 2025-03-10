"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
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

  // Redirect if already logged in
  useEffect(() => {
    console.log("Seller state in signup:", seller);
    if (seller) {
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

        // Force a small delay to ensure state updates
        setTimeout(() => {
          // Check if we need onboarding
          if (result.needsOnboarding) {
            console.log("Redirecting to onboarding after signup");
            router.push("/seller/onboarding");
          } else {
            console.log("Redirecting to dashboard after signup");
            router.push("/seller/dashboard");
          }
        }, 100);
      } else {
        toast.error(result.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f8]">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
        <h1 className="text-3xl font-semibold text-center text-[#8B6E5A] mb-8">
          Become a Seller
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              className="block text-[#8B6E5A] text-sm font-medium mb-2"
              htmlFor="phone"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
              pattern="[0-9]{10}"
              maxLength={10}
              required
            />
          </div>

          <div className="mb-6">
            <label
              className="block text-[#8B6E5A] text-sm font-medium mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <div className="mb-6">
            <label
              className="block text-[#8B6E5A] text-sm font-medium mb-2"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#8B6E5A] text-white py-3 rounded-md hover:bg-[#7d6351] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || formData.phone.length !== 10}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-gray-600">Already have an account? </span>
          <Link
            href="/seller/signin"
            className="text-[#8B6E5A] hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
