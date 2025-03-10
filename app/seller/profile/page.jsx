"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "react-hot-toast";
import Link from "next/link";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual profile content
function ProfileContent() {
  const router = useRouter();
  const { seller, updateSellerDetails, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    openTime: "",
    closeTime: "",
  });

  // Populate form with seller data
  useEffect(() => {
    if (seller) {
      setFormData({
        shopName: seller.shopName || "",
        ownerName: seller.ownerName || "",
        address: seller.address || "",
        city: seller.city || "",
        state: seller.state || "",
        pincode: seller.pincode || "",
        gstNumber: seller.gstNumber || "",
        openTime: seller.openTime || "",
        closeTime: seller.closeTime || "",
      });
    }
  }, [seller]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "pincode") {
      // Only allow numbers and max 6 digits
      const formattedValue = value.replace(/[^0-9]/g, "").slice(0, 6);
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    } else if (name === "gstNumber") {
      // Convert to uppercase and remove spaces
      const formattedValue = value.toUpperCase().replace(/\s/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!seller || !seller.id) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const result = await updateSellerDetails(seller.id, formData);

      if (result.success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    router.push("/seller/signin");
  };

  if (!seller) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-[#8B6E5A]">
            Seller Profile
          </h1>
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
                className="px-4 py-2 bg-[#8B6E5A] text-white rounded-md hover:bg-[#7d6351] transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Name
                </label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number (Optional)
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Time
                </label>
                <input
                  type="time"
                  name="openTime"
                  value={formData.openTime}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Time
                </label>
                <input
                  type="time"
                  name="closeTime"
                  value={formData.closeTime}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#8B6E5A] text-white px-6 py-3 rounded-md hover:bg-[#7d6351] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium text-gray-500">
                  Phone Number
                </h2>
                <p className="mt-1 text-lg">{seller.phone}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500">Joined On</h2>
                <p className="mt-1 text-lg">
                  {seller.createdAt
                    ? new Date(seller.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium text-gray-500">Shop Name</h2>
                <p className="mt-1 text-lg">{seller.shopName || "Not set"}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500">
                  Owner Name
                </h2>
                <p className="mt-1 text-lg">{seller.ownerName || "Not set"}</p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500">Address</h2>
              <p className="mt-1 text-lg">{seller.address || "Not set"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h2 className="text-sm font-medium text-gray-500">City</h2>
                <p className="mt-1 text-lg">{seller.city || "Not set"}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500">State</h2>
                <p className="mt-1 text-lg">{seller.state || "Not set"}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500">Pincode</h2>
                <p className="mt-1 text-lg">{seller.pincode || "Not set"}</p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500">GST Number</h2>
              <p className="mt-1 text-lg">{seller.gstNumber || "Not set"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium text-gray-500">
                  Opening Time
                </h2>
                <p className="mt-1 text-lg">{seller.openTime || "Not set"}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500">
                  Closing Time
                </h2>
                <p className="mt-1 text-lg">{seller.closeTime || "Not set"}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Quick Links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/seller/dashboard"
                  className="block p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-medium">Dashboard</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View your seller dashboard
                  </p>
                </Link>
                <Link
                  href="/seller/products"
                  className="block p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-medium">Products</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your product listings
                  </p>
                </Link>
                <Link
                  href="/seller/orders"
                  className="block p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-medium">Orders</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View and manage your orders
                  </p>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap the profile content with the ProtectedRoute component
// Note: requireOnboarding is false because we want to allow access to the profile
// even if onboarding is not completed (to allow completing it)
export default function SellerProfile() {
  return (
    <ProtectedRoute requireOnboarding={false}>
      <ProfileContent />
    </ProtectedRoute>
  );
}
