"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import SellerTermsModal from "@/app/components/SellerTermsModal";
import LoadingButton from "@/app/components/LoadingButton";

export default function SellerSignup() {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

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

    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("Registering with:", formData.phone);
      const result = await register(formData.phone, formData.password);
      console.log("Registration result:", result);

      if (result && result.accessToken) {
        toast.success("Registration successful!");

        // Set a flag in localStorage to indicate this is a new registration
        localStorage.setItem("isNewRegistration", "true");

        // Simple direct navigation - no complex state management
        console.log("Redirecting new seller to onboarding");
        router.push("/seller/onboarding");
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

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    // Automatically submit the form after accepting terms
    if (
      formData.password === formData.confirmPassword &&
      formData.phone.length === 10
    ) {
      handleSubmit({ preventDefault: () => {} });
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={() => setTermsAccepted(!termsAccepted)}
                className="h-4 w-4 text-primary border-ui-border rounded focus:ring-primary"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-text">
                I accept and agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-blue-500 hover:underline"
                >
                  Terms of Use
                </button>
                .
              </label>
            </div>

            <LoadingButton
              type="submit"
              variant="secondary"
              className="w-full py-3 text-lg font-bold text-white bg-ui-button hover:bg-ui"
              fullWidth
              isLoading={loading}
              loadingText="Signing up..."
              disabled={formData.phone.length !== 10 || !termsAccepted}
            >
              Sign Up
            </LoadingButton>

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

      {/* Terms and Conditions Modal */}
      <SellerTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleTermsAccept}
      />
    </div>
  );
}
