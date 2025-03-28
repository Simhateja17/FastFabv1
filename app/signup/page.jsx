"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useUserAuth } from "@/app/context/UserAuthContext";
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiMessageCircle,
} from "react-icons/fi";
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
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [usePhoneAuth, setUsePhoneAuth] = useState(false);

  // Phone verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");

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
    if (name === "phone" && value && !value.startsWith("+")) {
      processedValue = "+" + value;
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  // Handle regular registration with email and password
  const handleRegularSignup = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (
      !formData.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (usePhoneAuth) {
      if (!formData.phone.match(/^\+[1-9]\d{8,14}$/)) {
        toast.error(
          "Please enter a valid phone number with country code (e.g., +916309599582)"
        );
        return;
      }
    } else {
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setLoading(true);

    try {
      // If using phone authentication, send OTP first
      if (usePhoneAuth) {
        handleSendOtp();
        return;
      }

      // Regular registration
      const response = await fetch(USER_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store user data and tokens
        localStorage.setItem("userData", JSON.stringify(result.data.user));
        localStorage.setItem("userAccessToken", result.data.tokens.accessToken);
        localStorage.setItem(
          "userRefreshToken",
          result.data.tokens.refreshToken
        );

        toast.success("Account created successfully!");
        router.push("/");
      } else {
        toast.error(result.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        "Registration failed. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle sending OTP via WhatsApp
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();

    // Validate phone format (must include country code)
    if (!formData.phone.match(/^\+[1-9]\d{8,14}$/)) {
      toast.error(
        "Please enter a valid phone number with country code (e.g., +916309599582)"
      );
      return;
    }

    setOtpLoading(true);

    try {
      // Use the WhatsApp OTP service from context
      const result = await sendWhatsAppOTP(formData.phone);
      console.log("WhatsApp OTP result:", result);

      if (result.success) {
        setOtpSent(true);
        setExpiresAt(result.expiresAt);
        
        // Check if it's a partial success (OTP generated but delivery issue)
        if (result.warning) {
          toast.success(result.message, { 
            icon: '⚠️',
            duration: 6000 // Show warning for longer
          });
        } else {
          toast.success("OTP sent to your WhatsApp number");
        }
      } else {
        console.error("Failed to send OTP:", result);
        
        // Display specific error message based on the error code
        if (result.code === "P1001" || result.code === "P1002") {
          toast.error("Unable to connect to the database. Please try again later.");
        } else if (result.code === "P2002") {
          toast.error("A validation error occurred. Please check your input.");
        } else {
          toast.error(result.message || "Failed to send OTP. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP verification and registration
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setOtpLoading(true);

    try {
      // Use the WhatsApp OTP verification service from context
      const result = await verifyWhatsAppOTP(formData.phone, otpCode);

      if (result.success) {
        if (result.isNewUser) {
          // New user - complete registration with phone verified
          const registerResult = await registerWithPhone({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          });

          if (registerResult.success) {
            toast.success("Account created and verified successfully!");
            router.push("/");
          } else {
            toast.error(registerResult.message || "Registration failed. Please try again.");
          }
        } else {
          // Existing user - already logged in by verifyWhatsAppOTP
          toast.success("Logged in successfully!");
          router.push("/");
        }
      } else {
        toast.error(result.message || "OTP verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("OTP verification failed. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Switch between password and phone auth
  const toggleAuthMethod = () => {
    setUsePhoneAuth(!usePhoneAuth);
    setOtpSent(false);
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
            Create your account
          </h1>
        </div>

        <div className="bg-background-card p-8 rounded-lg shadow-sm">
          {!otpSent ? (
            <form onSubmit={handleRegularSignup} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-text-dark mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-text-muted" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-dark mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-text-muted" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {usePhoneAuth ? (
                !otpSent ? (
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-text-dark mb-1"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="text-text-muted" />
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                        placeholder="+916309599582"
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      Enter full number with country code (e.g., +916309599582 for India)
                    </p>
                  </div>
                ) : null
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-text-dark mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="text-text-muted" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required={!usePhoneAuth}
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-text-dark mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="text-text-muted" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required={!usePhoneAuth}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-secondary focus:ring-secondary border-ui-border rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-text">
                  I agree to the{" "}
                  <Link
                    href="/terms-of-service"
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || otpLoading}
                className="w-full bg-secondary text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || otpLoading
                  ? usePhoneAuth
                    ? "Sending OTP..."
                    : "Creating Account..."
                  : usePhoneAuth
                  ? "Send OTP to WhatsApp"
                  : "Create Account"}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={toggleAuthMethod}
                  className="text-sm text-primary hover:underline"
                >
                  {usePhoneAuth
                    ? "Sign up with email and password instead"
                    : "Sign up with WhatsApp verification instead"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="otpCode"
                    className="block text-sm font-medium text-text-dark"
                  >
                    Enter OTP from WhatsApp
                  </label>
                  {expiresAt && (
                    <span
                      className={`text-sm ${
                        timeRemaining === "Expired"
                          ? "text-error font-bold"
                          : "text-text-muted"
                      }`}
                    >
                      {timeRemaining === "Expired"
                        ? "Expired"
                        : `Expires in: ${timeRemaining}`}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMessageCircle className="text-text-muted" />
                  </div>
                  <input
                    id="otpCode"
                    name="otpCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(
                        e.target.value.replace(/\D/g, "").substring(0, 6)
                      )
                    }
                    className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input text-center tracking-widest"
                    placeholder="6-digit OTP"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full bg-secondary text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpLoading ? "Verifying..." : "Verify OTP & Create Account"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (timeRemaining === "Expired") {
                      handleSendOtp();
                    } else {
                      setOtpSent(false);
                    }
                  }}
                  className="w-full border border-ui-border text-text py-3 rounded-md hover:bg-background-hover transition-colors"
                >
                  {timeRemaining === "Expired" ? "Resend OTP" : "Go Back"}
                </button>
              </div>
            </form>
          )}

          <div className="text-center text-sm text-text-muted mt-6">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
