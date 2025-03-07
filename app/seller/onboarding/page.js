"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/app/config";

const validateGSTIN = (gstin) => {
  // GSTIN Format: 22AAAAA0000A1Z5
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]Z[0-9A-Z]$/;

  if (!gstinRegex.test(gstin)) {
    return false;
  }

  // Validate state code (first 2 digits between 01-38)
  const stateCode = parseInt(gstin.slice(0, 2));
  const validStateCodes = [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
    "31", "32", "33", "34", "35", "36", "37", "38",
  ];

  if (!validStateCodes.includes(gstin.slice(0, 2))) {
    return false;
  }

  return true;
};

export default function SellerOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gstError, setGstError] = useState("");
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "gstNumber") {
      // Convert to uppercase and remove spaces
      const formattedValue = value.toUpperCase().replace(/\s/g, "");

      // Clear GST error when input changes
      setGstError("");

      // Validate GST format when user types
      if (formattedValue.length === 15) {
        if (!validateGSTIN(formattedValue)) {
          setGstError("Invalid GST number format");
        }
      }

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
    setError("");
  
    // Final GST validation before submit
    if (!validateGSTIN(formData.gstNumber)) {
      setGstError("Invalid GST number format");
      setLoading(false);
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      const sellerId = localStorage.getItem("sellerId"); // Ensure sellerId is fetched correctly
  
      if (!sellerId) {
        throw new Error("Seller ID is missing from localStorage.");
      }
  
      if (!token) {
        throw new Error("JWT token is missing from localStorage.");
      }
  
      const response = await fetch(`${API_URL}/api/${sellerId}/details`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
  
      if (!response.ok) {
        const errorData = await response.text(); // Use text() instead of json() first
        console.error("Server response:", errorData);
        throw new Error(`Failed to update seller details: ${errorData}`);
      }
  
      const data = await response.json();
      router.push("/seller/dashboard");
    } catch (error) {
      console.error("Error details:", error);
      setError(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-[#8B6E5A] mb-6">
          Complete Your Profile
        </h1>

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
                pattern="[0-9]{6}"
                maxLength={6}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Number
            </label>
            <input
              type="text"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleInputChange}
              className={`w-full p-3 border ${
                gstError ? "border-red-500" : "border-gray-300"
              } rounded-md uppercase focus:outline-none focus:ring-2 focus:ring-[#8B6E5A]`}
              maxLength={15}
              required
            />
            {gstError && (
              <p className="mt-1 text-sm text-red-600">{gstError}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Format: 2 digits (state code) + 5 letters (PAN) + 4 digits + 1
              letter + Z + 1 character
            </p>
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

          <div className="flex justify-end space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#8B6E5A] text-white rounded hover:bg-[#7d6351] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Complete Setup"}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600 text-center">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
