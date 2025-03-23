"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function UserProfile() {
  const router = useRouter();
  const {
    user,
    updateUserProfile,
    logout,
    loading: authLoading,
  } = useUserAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    // If user is not logged in, redirect to signin
    if (!authLoading && !user) {
      toast.error("Please sign in to view your profile");
      router.push("/signin");
      return;
    }

    // Pre-fill form with existing user data if available
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
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

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);

    try {
      const result = await updateUserProfile(formData);

      if (result.success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
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

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    router.push("/signin");
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Your Profile</h1>
          <div className="flex space-x-4">
            {isEditing ? (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors"
              >
                Edit Profile
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-secondary text-white px-6 py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-gray-500">Full Name</h2>
              <p className="mt-1 text-lg">{user.name || "Not set"}</p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500">
                Email Address
              </h2>
              <p className="mt-1 text-lg">{user.email || "Not set"}</p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500">
                Phone Number
              </h2>
              <p className="mt-1 text-lg">{user.phone || "Not set"}</p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500">
                Member Since
              </h2>
              <p className="mt-1 text-lg">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Not available"}
              </p>
            </div>

            <hr className="my-6 border-gray-200" />

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/orders"
                  className="block p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-medium">My Orders</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View and track your orders
                  </p>
                </Link>

                <Link
                  href="/address"
                  className="block p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-medium">My Addresses</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your delivery addresses
                  </p>
                </Link>

                <Link
                  href="/wishlist"
                  className="block p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-medium">My Wishlist</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View your saved items
                  </p>
                </Link>

                <button
                  onClick={handleLogout}
                  className="block p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors text-left w-full"
                >
                  <h3 className="font-medium text-red-600">Logout</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Sign out from your account
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
