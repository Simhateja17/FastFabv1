"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useUserAuth } from "@/app/context/UserAuthContext";

export default function SignIn() {
  const router = useRouter();
  const { sendOTP, verifyOTP, loading: authLoading } = useUserAuth();
  const [step, setStep] = useState(1); // 1: Phone number, 2: OTP
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();

    // Validate phone number (10 digits)
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);

    try {
      const result = await sendOTP(phoneNumber);

      if (result.success) {
        toast.success(result.message || "OTP sent to your phone number");
        setStep(2);
      } else {
        toast.error(result.error || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Error sending OTP:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    // Validate OTP (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOTP(phoneNumber, otp);

      if (result.success) {
        toast.success("Sign in successful!");
        router.push("/"); // Redirect to home page after successful sign in
      } else {
        toast.error(result.error || "Failed to verify OTP. Please try again.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Error verifying OTP:", error);
    } finally {
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
          <h1 className="text-xl font-medium text-text-dark">Login/Sign up</h1>
        </div>

        <div className="bg-background-card p-8 rounded-lg shadow-sm">
          {step === 1 ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label htmlFor="phone" className="sr-only">
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                  placeholder="Phone number"
                />
              </div>

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-secondary text-primary py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || authLoading ? "Sending OTP..." : "Continue"}
              </button>

              <div className="text-center text-sm text-text-muted">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="sr-only">
                  OTP
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                    placeholder="OTP"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-secondary text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || authLoading ? "Verifying..." : "Continue"}
              </button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-primary hover:underline"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
