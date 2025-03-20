"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "react-hot-toast";

import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function SellerOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { seller, updateSellerDetails, authFetch, setSeller } = useAuth();
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

  // Redirect if not logged in
  useEffect(() => {
    if (!seller) {
      toast.error("Please sign in to continue");
      router.push("/seller/signin");
    } else if (seller.shopName && !seller.needsOnboarding) {
      // Only redirect to dashboard if seller has completed onboarding
      // and doesn't need onboarding anymore
      router.push("/seller/dashboard");
    }
  }, [seller, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "gstNumber") {
      // Convert to uppercase and remove spaces
      const formattedValue = value.toUpperCase().replace(/\s/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    } else if (name === "pincode") {
      // Only allow numbers and max 6 digits
      const formattedValue = value.replace(/[^0-9]/g, "").slice(0, 6);
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
      console.log("Update profile response:", result);

      if (result.success) {
        toast.success("Profile updated successfully!");
        // Update local seller state to remove needsOnboarding flag
        const updatedSeller = {
          ...seller,
          ...result.seller,
          needsOnboarding: false,
        };

        // Update the seller context
        setSeller(updatedSeller);

        // Store updated seller in localStorage as a backup
        localStorage.setItem("sellerData", JSON.stringify(updatedSeller));

        // Redirect to dashboard
        router.push("/seller/dashboard");
      } else {
        const errorMessage = result.error || "Failed to update profile";
        console.error("Profile update failed:", errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!seller) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="large" color="secondary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-background-card rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-primary mb-6">
          Complete Your Profile
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Shop Name
              </label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Owner Name
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
                maxLength={6}
                pattern="[0-9]{6}"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              GST Number (Must)
            </label>
            <input
              type="text"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleInputChange}
              className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
              maxLength={15}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Opening Time
              </label>
              <input
                type="time"
                name="openTime"
                value={formData.openTime}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Closing Time
              </label>
              <input
                type="time"
                name="closeTime"
                value={formData.closeTime}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary text-white py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Complete Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
