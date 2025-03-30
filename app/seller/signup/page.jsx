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
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const router = useRouter();
  const { registerWithOTP } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // Only allow numbers and limit to 10 digits
      const numericValue = value.replace(/[^0-9]/g, "");
      if (numericValue.length <= 10) {
        setFormData((prev) => ({ ...prev, [name]: numericValue }));
      }
    } else if (name === "otpCode") {
      // Only allow numbers and limit to 6 digits
      const numericValue = value.replace(/[^0-9]/g, "");
      if (numericValue.length <= 6) {
        setOtpCode(numericValue);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    if (formData.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/whatsapp-otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formData.phone }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("OTP sent to your WhatsApp number");
        setOtpSent(true);
      } else {
        toast.error(data.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/whatsapp-otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: formData.phone,
          otpCode 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // OTP verified successfully, now register the seller
        const result = await registerWithOTP(formData.phone);
        
        if (result && result.success) {
          toast.success("Registration successful!");
          // Set a flag in localStorage to indicate this is a new registration
          localStorage.setItem("isNewRegistration", "true");
          // Redirect to onboarding
          router.push("/seller/onboarding");
        } else {
          toast.error(result.error || "Registration failed. Please try again.");
        }
      } else {
        toast.error(data.message || "OTP verification failed. Please try again.");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    // Don't automatically submit after accepting terms
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
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
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
                loadingText="Sending OTP..."
                disabled={formData.phone.length !== 10 || !termsAccepted}
              >
                Get OTP on WhatsApp
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
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label
                  htmlFor="otpCode"
                  className="block text-sm font-medium text-text mb-1"
                >
                  Enter OTP from WhatsApp
                </label>
                <input
                  type="text"
                  id="otpCode"
                  name="otpCode"
                  className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={handleChange}
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </div>

              <LoadingButton
                type="submit"
                variant="secondary"
                className="w-full py-3 text-lg font-bold text-white bg-ui-button hover:bg-ui"
                fullWidth
                isLoading={loading}
                loadingText="Verifying..."
                disabled={otpCode.length !== 6}
              >
                Verify & Sign Up
              </LoadingButton>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full py-2 text-sm text-primary hover:underline"
              >
                Change Phone Number
              </button>
            </form>
          )}
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
