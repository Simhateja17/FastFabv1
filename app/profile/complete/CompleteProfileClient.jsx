"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function CompleteProfileClient() {
  const router = useRouter();
  const { user, updateUserProfile, loading: authLoading } = useUserAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    gender: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    // If user is not logged in, redirect to signin
    if (!authLoading && !user) {
      toast.error("Please sign in to complete your profile");
      router.push("/signin");
    }

    // If user already has a complete profile, redirect to home
    if (user && user.name && user.email) {
      router.push("/");
    }

    // Pre-fill form with existing user data if available
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split("T")[0]
          : "",
      });
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const result = await updateUserProfile(formData);

      if (result.success) {
        toast.success("Profile updated successfully!");
        router.push("/");
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" color="primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-gray-600">
            Please provide some additional information to complete your profile.
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Complete Profile"}
            </button>

            <div className="text-center text-sm text-gray-500">
              You can update these details later from your profile settings.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 