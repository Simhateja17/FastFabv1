"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { FiMail, FiLock, FiPhone, FiMessageCircle } from "react-icons/fi";
import { USER_ENDPOINTS } from "@/app/config";

export default function SignIn() {
  const router = useRouter();
  const { user, loading: authLoading } = useUserAuth();
  const [activeTab, setActiveTab] = useState("email"); // 'email' or 'phone'

  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone login state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Effect to update timer
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
    console.log("SignIn component rendered - Auth state:", {
      user,
      authLoading,
    });
    if (user && !authLoading) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Handle email/password login
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    console.log("Attempting login with email:", email);

    try {
      const response = await fetch(USER_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Login response:", result);

        // Store user data and tokens
        localStorage.setItem("userData", JSON.stringify(result.data.user));
        localStorage.setItem("userAccessToken", result.data.tokens.accessToken);
        localStorage.setItem(
          "userRefreshToken",
          result.data.tokens.refreshToken
        );

        toast.success("Login successful!");
        router.push("/");
      } else {
        console.error("Login failed:", result);

        // If account requires phone auth, switch to phone auth tab
        if (result.code === "PHONE_AUTH_REQUIRED" && result.phone) {
          setActiveTab("phone");
          setPhone(result.phone);
          toast.error("This account requires phone authentication");
        } else {
          toast.error(result.message || "Login failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle sending OTP via WhatsApp
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();

    // Validate phone number (only check for 10 digits)
    if (!phone.match(/^\d{10}$/) && !phone.match(/^\+[1-9]\d{1,14}$/)) {
      toast.error(
        "Please enter a valid 10-digit phone number"
      );
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch(USER_ENDPOINTS.PHONE_AUTH_START, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setExpiresAt(new Date(result.expiresAt));
        toast.success("OTP sent to your WhatsApp. Valid for 10 minutes.");
      } else {
        toast.error(result.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error(
        "Failed to send OTP. Please check your connection and try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch(USER_ENDPOINTS.PHONE_AUTH_VERIFY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          otpCode,
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

        toast.success("Phone verification successful!");
        router.push("/");
      } else {
        toast.error(result.message || "Verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error(
        "Verification failed. Please check your connection and try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // Add leading + to phone number if missing
  const handlePhoneChange = (e) => {
    let value = e.target.value;
    if (value && !value.startsWith("+")) {
      value = "+" + value;
    }
    setPhone(value);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log("SignIn process completed");

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
          {/* Authentication Method Tabs */}
          <div className="flex border-b border-ui-border mb-6">
            <button
              className={`flex-1 py-3 font-medium text-sm ${
                activeTab === "email"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text hover:text-text-dark"
              }`}
              onClick={() => setActiveTab("email")}
            >
              <div className="flex items-center justify-center">
                <FiMail className="mr-2" />
                <span>Email</span>
              </div>
            </button>
            <button
              className={`flex-1 py-3 font-medium text-sm ${
                activeTab === "phone"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text hover:text-text-dark"
              }`}
              onClick={() => setActiveTab("phone")}
            >
              <div className="flex items-center justify-center">
                <FiPhone className="mr-2" />
                <span>Phone</span>
              </div>
            </button>
          </div>

          {/* Email Login Form */}
          {activeTab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-6">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

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
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                    placeholder="••••••••"
                  />
                </div>
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
                disabled={loading}
                className="w-full bg-secondary text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          {/* Phone Login Form */}
          {activeTab === "phone" && (
            <div className="space-y-6">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
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
                        type="text"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="w-full pl-10 px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary bg-input"
                        placeholder="9876543210"
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      Enter your 10-digit phone number
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full bg-secondary text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otpLoading ? "Sending OTP..." : "Send OTP to WhatsApp"}
                  </button>
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
                      {otpLoading ? "Verifying..." : "Verify OTP"}
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
                      {timeRemaining === "Expired"
                        ? "Resend OTP"
                        : "Change Phone Number"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="text-center text-sm text-text-muted mt-6">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
