"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function SellerSignin() {
  const [formData, setFormData] = useState({
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [expiryTime, setExpiryTime] = useState(null);
  const timerRef = useRef(null);
  
  const router = useRouter();
  const { login, seller, sendSellerOTP, verifySellerOTP } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (seller) {
      router.push("/seller/dashboard");
    }
  }, [seller, router]);

  // Format time remaining for OTP
  useEffect(() => {
    if (expiryTime) {
      const updateTimer = () => {
        const now = new Date();
        const expiry = new Date(expiryTime);
        const diff = Math.max(0, Math.floor((expiry - now) / 1000)); // difference in seconds
        
        if (diff <= 0) {
          setTimeRemaining("Expired");
          clearInterval(timerRef.current);
        } else {
          const minutes = Math.floor(diff / 60);
          const seconds = diff % 60;
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      
      // Initial update
      updateTimer();
      
      // Clear any existing interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Set up the interval
      timerRef.current = setInterval(updateTimer, 1000);
      
      // Clean up on unmount or when expiryTime changes
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [expiryTime]);

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

  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!formData.phone || formData.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setOtpLoading(true);
    
    try {
      const result = await sendSellerOTP(formData.phone);
      
      if (result.success) {
        setOtpSent(true);
        setExpiryTime(result.expiresAt);
        toast.success("OTP sent to your WhatsApp number");
      } else {
        toast.error(result.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!otpCode || otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setOtpLoading(true);
    
    try {
      const result = await verifySellerOTP(formData.phone, otpCode);
      
      if (result.success) {
        if (result.isNewSeller) {
          toast.error("This phone number is not registered. Please sign up first.");
          router.push("/seller/signup");
        } else {
          toast.success("Phone number verified successfully!");
          
          // Fetch the seller profile
          const loginResult = await login(formData.phone);
          
          if (loginResult.success) {
            toast.success("Login successful!");
            router.push("/seller/dashboard");
          } else {
            toast.error(loginResult.error || "Failed to log in");
          }
        }
      } else {
        toast.error(result.error || "Failed to verify OTP");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timeRemaining !== "Expired" && timeRemaining !== null) {
      toast.error("Please wait until the current OTP expires");
      return;
    }
    
    await handleSendOtp();
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
          <h1 className="text-xl font-medium text-text-dark">Seller Login</h1>
        </div>

        <div className="bg-background-card p-8 rounded-lg shadow-sm">
          <form onSubmit={handleSendOtp} className="space-y-6">
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
                disabled={otpSent}
              />
            </div>

            {!otpSent ? (
              <button
                type="submit"
                className="w-full text-pink-500 text-bold hover:text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={otpLoading || formData.phone.length !== 10}
              >
                {otpLoading ? "Sending OTP..." : "Send OTP to WhatsApp"}
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="otp"
                      className="block text-sm font-medium text-text-dark"
                    >
                      Enter OTP from WhatsApp
                    </label>
                    {timeRemaining && (
                      <span
                        className={`text-xs font-medium ${
                          timeRemaining === "Expired"
                            ? "text-red-500"
                            : "text-green-600"
                        }`}
                      >
                        {timeRemaining === "Expired"
                          ? "OTP Expired"
                          : `Expires in: ${timeRemaining}`}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    id="otp"
                    className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => {
                      // Only allow digits and limit to 6
                      const numericValue = e.target.value.replace(/[^0-9]/g, "");
                      if (numericValue.length <= 6) {
                        setOtpCode(numericValue);
                      }
                    }}
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="w-full text-pink-500 text-bold hover:text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={otpLoading || otpCode.length !== 6}
                >
                  {otpLoading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-secondary hover:underline"
                    disabled={timeRemaining && timeRemaining !== "Expired"}
                  >
                    Resend OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-gray-500 hover:underline"
                  >
                    Change Phone Number
                  </button>
                </div>
              </div>
            )}

            <div className="text-center text-sm text-text-muted">
              Don&apos;t have an account?{" "}
              <Link
                href="/seller/signup"
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
