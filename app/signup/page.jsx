"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { FiUser, FiMessageCircle } from "react-icons/fi";
import { USER_ENDPOINTS } from "@/app/config";

export default function SignUp() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    sendWhatsAppOTP,
    verifyWhatsAppOTP,
    registerWithPhone,
  } = useUserAuth();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  // Phone verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [error, setError] = useState("");
  
  // New user onboarding
  const [isNewUser, setIsNewUser] = useState(false);
  const [nameCollectionShown, setNameCollectionShown] = useState(false);

  // Timer for OTP expiration
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setTimeRemaining(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Check if user is already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Special handling for phone number
    if (name === "phone") {
      // Remove non-digit characters except +
      processedValue = value.replace(/[^\d+]/g, "");

      // If there's no + at the beginning and it's not empty, add it
      if (processedValue && !processedValue.startsWith("+")) {
        processedValue = "+" + processedValue;
      }
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  // Handle signup form submission (now only for WhatsApp OTP)
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Check if phone number has exactly 10 digits (after removing the +91 prefix)
    const phoneWithoutPrefix = formData.phone.replace(/^\+91/, '');
    if (phoneWithoutPrefix.length !== 10 || !/^\d{10}$/.test(phoneWithoutPrefix)) {
      const errorMsg = "Please enter a valid 10-digit Indian mobile number";
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    setLoading(true);
    try {
      handleSendOtp();
    } catch (error) {
      console.error("Error initiating WhatsApp authentication:", error);
      toast.error(
        "Failed to initiate WhatsApp authentication. Please try again."
      );
      setError("Failed to initiate WhatsApp authentication. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle sending OTP via WhatsApp
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");

    // Check if phone number has exactly 10 digits (after removing the +91 prefix)
    const phoneWithoutPrefix = formData.phone.replace(/^\+91/, '');
    if (phoneWithoutPrefix.length !== 10 || !/^\d{10}$/.test(phoneWithoutPrefix)) {
      const errorMsg = "Please enter a valid 10-digit Indian mobile number";
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    setOtpLoading(true);

    try {
      // Use the WhatsApp OTP service from context
      console.log("Sending OTP for phone (Signup Page):", formData.phone);
      const result = await sendWhatsAppOTP(formData.phone);
      console.log("WhatsApp OTP result:", result);

      if (result.success) {
        setOtpSent(true);
        setExpiresAt(result.expiresAt);

        // Check if it's a partial success (OTP generated but delivery issue)
        if (result.warning) {
          toast.success(result.message, {
            icon: "⚠️",
            duration: 6000, // Show warning for longer
          });
        } else {
          toast.success("OTP sent to your WhatsApp number");
        }
      } else {
        console.error("Failed to send OTP:", result);

        // Display specific error message based on the error code
        if (result.code === "P1001" || result.code === "P1002") {
          setError(
            "Unable to connect to the database. Please try again later."
          );
          toast.error(
            "Unable to connect to the database. Please try again later."
          );
        } else if (result.code === "P2002") {
          setError("A validation error occurred. Please check your input.");
          toast.error("A validation error occurred. Please check your input.");
        } else {
          setError(result.message || "Failed to send OTP. Please try again.");
          toast.error(
            result.message || "Failed to send OTP. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("Failed to send OTP. Please try again.");
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP verification and registration
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setError("");

    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      toast.error("Please enter a valid 6-digit OTP");
      setOtpLoading(false);
      return;
    }

    try {
      // Use the WhatsApp OTP verification service from context
      console.log("Verifying OTP for phone (Signup Page):", formData.phone);
      const result = await verifyWhatsAppOTP(formData.phone, otpCode);

      if (result.success) {
        if (result.isNewUser) {
          // New user - we need to collect their name
          setIsNewUser(true);
          setNameCollectionShown(true);
          setOtpSent(false); // Hide OTP form
          toast.success("Phone verified! Please provide your name to continue");
        } else {
          // Existing user - already logged in by verifyWhatsAppOTP
          toast.success("Logged in successfully!");
          // Force a full page reload to make sure the auth state is reflected
          window.location.href = "/";
        }
      } else {
        setError(
          result.message || "OTP verification failed. Please try again."
        );
        toast.error(
          result.message || "OTP verification failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError("OTP verification failed. Please try again.");
      toast.error("OTP verification failed. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Submit name for new user
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate name
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      setError("Please enter your name");
      setLoading(false);
      return;
    }

    try {
      // Complete registration with phone verified
      const registerResult = await registerWithPhone({
        name: formData.name,
        phone: formData.phone,
        isPhoneVerified: true, // Since we verified via OTP
      });

      if (registerResult.success) {
        toast.success("Account created successfully!");
        // Force a full page reload to make sure the auth state is reflected
        window.location.href = "/";
      } else {
        setError(
          registerResult.message || "Registration failed. Please try again."
        );
        toast.error(
          registerResult.message || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Error completing registration:", error);
      setError("Registration failed. Please try again.");
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = () => {
    // Only allow resend if the timer shows "Expired" or is empty
    if (timeRemaining === "Expired" || !timeRemaining) {
      handleSendOtp();
    } else {
      toast.error(
        `Please wait until the current OTP expires (${timeRemaining})`
      );
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
            Log in or create an account
          </h1>
          <p className="text-text-muted mt-2">
            Enter your phone number to continue
          </p>
        </div>

        <div className="bg-background-card p-8 rounded-lg shadow-sm">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          {!otpSent && !nameCollectionShown ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-text-dark mb-1"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <div className="flex rounded-md overflow-hidden border border-gray-300">
                    <div className="bg-gray-50 px-3 py-3 flex items-center text-gray-500 border-r border-gray-300">
                      +91
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone.replace(/^\+91/, '')}
                      onChange={(e) => {
                        // Only allow digits and limit to 10 characters
                        const value = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                        handleInputChange({
                          target: {
                            name: 'phone',
                            value: `+91${value}`
                          }
                        });
                      }}
                      placeholder="Enter your number"
                      className="w-full p-3 border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  WhatsApp OTP will be sent to this number
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-white text-base uppercase font-bold tracking-wide transition-all duration-300 ${
                  loading ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-black hover:bg-gray-800 hover:shadow-xl active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  "Get OTP on WhatsApp"
                )}
              </button>
            </form>
          ) : otpSent ? (
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
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMessageCircle className="text-gray-400" />
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, "");
                      setOtpCode(value);
                    }}
                    placeholder="6-digit OTP"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={timeRemaining && timeRemaining !== "Expired"}
                    className={`text-sm text-primary hover:text-primary-dark ${
                      timeRemaining && timeRemaining !== "Expired"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-white text-base uppercase font-bold tracking-wide transition-all duration-300 ${
                  otpLoading ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-black hover:bg-gray-800 hover:shadow-xl active:scale-[0.98]'
                }`}
              >
                {otpLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  ← Back to phone entry
                </button>
              </div>
            </form>
          ) : nameCollectionShown ? (
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-text-dark mb-1"
                >
                  Your Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Please tell us what to call you
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-white text-base uppercase font-bold tracking-wide transition-all duration-300 ${
                  loading ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-black hover:bg-gray-800 hover:shadow-xl active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </button>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setNameCollectionShown(false);
                    setOtpSent(false);
                  }}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  ← Back to phone entry
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
