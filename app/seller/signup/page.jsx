"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import SellerTermsModal from "@/app/components/SellerTermsModal";
import LoadingButton from "@/app/components/LoadingButton";

function SellerSignupContent() {
  const [step, setStep] = useState(1); // Step 1: Phone entry, Step 2: OTP verification
  const [formData, setFormData] = useState({
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [expiryTime, setExpiryTime] = useState(null);
  const timerRef = useRef(null);
  
  const router = useRouter();
  const { register, sendSellerOTP, verifySellerOTP } = useAuth();

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
    e.preventDefault();
    
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
        setStep(2);
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
    
    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    setOtpLoading(true);
    
    try {
      const result = await verifySellerOTP(formData.phone, otpCode);
      
      if (result.success) {
        setOtpVerified(true);
        toast.success("Phone number verified successfully");
        
        // Proceed with registration
        try {
          console.log("Registering with:", formData.phone);
          toast.loading("Creating your seller account...");
          const registerResult = await register(formData.phone);
          toast.dismiss();
          
          if (registerResult && registerResult.accessToken) {
            toast.success("Registration successful!");

            // Set a flag in localStorage to indicate this is a new registration
            localStorage.setItem("isNewRegistration", "true");

            // Simple direct navigation - no complex state management
            console.log("Redirecting new seller to onboarding");
            router.push("/seller/onboarding");
          } else {
            toast.error(registerResult?.error || "Registration failed. Please try again.");
          }
        } catch (registerError) {
          console.error("Registration error:", registerError);
          toast.error(registerError?.message || "Something went wrong. Please try again.");
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
    
    await handleSendOtp({ preventDefault: () => {} });
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    // Automatically submit the form after accepting terms
    if (otpCode.length === 6 && formData.phone.length === 10) {
      handleVerifyOtp({ preventDefault: () => {} });
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
          <h1 className="text-xl font-medium text-text-dark">Seller Registration</h1>
        </div>

        <div className="bg-background-card p-8 rounded-lg shadow-sm">
          {step === 1 && (
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
                  placeholder="Enter your 10-digit phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </div>

              <LoadingButton
                type="submit"
                variant="secondary"
                className="w-full py-3 text-lg font-bold text-white bg-ui-button hover:bg-ui"
                fullWidth
                isLoading={otpLoading}
                loadingText="Sending OTP..."
                disabled={formData.phone.length !== 10}
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
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
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

              <div className="flex items-center mb-4">
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

              <div className="flex flex-col space-y-3">
                <LoadingButton
                  type="submit"
                  variant="secondary"
                  className="w-full py-3 text-lg font-bold text-white bg-ui-button hover:bg-ui"
                  fullWidth
                  isLoading={otpLoading}
                  loadingText="Verifying..."
                  disabled={otpCode.length !== 6 || !termsAccepted}
                >
                  Verify & Create Account
                </LoadingButton>
                
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
                  onClick={() => setStep(1)}
                  className="text-gray-500 hover:underline"
                >
                  Change Phone Number
                </button>
              </div>
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

export default function SellerSignup() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>}>
      <SellerSignupContent />
    </Suspense>
  );
}
