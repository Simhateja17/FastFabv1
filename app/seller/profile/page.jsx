"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "react-hot-toast";
import Link from "next/link";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import {
  FiUser,
  FiChevronRight,
  FiEdit,
  FiLogOut,
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiMapPin,
} from "react-icons/fi";

// The actual profile content
function ProfileContent() {
  const router = useRouter();
  const { seller, updateSellerDetails, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
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
    latitude: null,
    longitude: null,
  });

  // Extract the actual seller data from the nested structure
  const sellerData = seller?.seller || seller;
  console.log(sellerData);

  // Populate form with seller data
  useEffect(() => {
    if (sellerData) {
      setFormData({
        shopName: sellerData.shopName || "",
        ownerName: sellerData.ownerName || "",
        address: sellerData.address || "",
        city: sellerData.city || "",
        state: sellerData.state || "",
        pincode: sellerData.pincode || "",
        gstNumber: sellerData.gstNumber || "",
        openTime: sellerData.openTime || "",
        closeTime: sellerData.closeTime || "",
        latitude: sellerData.latitude || null,
        longitude: sellerData.longitude || null,
      });
    }
  }, [sellerData]);

  // Check if Google Maps API is loaded
  useEffect(() => {
    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log("Google Maps API detected");
        setMapsLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkGoogleMapsLoaded()) {
      return;
    }

    // If not loaded yet, set up an interval to check
    const intervalId = setInterval(() => {
      if (checkGoogleMapsLoaded()) {
        clearInterval(intervalId);
      }
    }, 300);

    // Clean up interval
    return () => clearInterval(intervalId);
  }, []);

  // Initialize Google Maps Autocomplete when editing and Maps API is loaded
  useEffect(() => {
    if (isEditing && mapsLoaded && addressInputRef.current) {
      try {
        console.log("Initializing Google Maps Autocomplete for address field");
        
        // Create autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            componentRestrictions: { country: "in" },
            fields: ["address_components", "formatted_address", "geometry"],
            types: ['establishment', 'geocode']
          }
        );
        
        // Add listener for place selection
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          handlePlaceSelection(place);
        });
      } catch (error) {
        console.error("Error initializing Google Maps Autocomplete:", error);
      }
      
      // Clean up on unmount or when editing state changes
      return () => {
        if (autocompleteRef.current && window.google) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
      };
    }
  }, [isEditing, mapsLoaded]);

  // Handle place selection from Google Maps Autocomplete
  const handlePlaceSelection = (place) => {
    try {
      if (!place || !place.geometry) {
        console.warn("Invalid place object received");
        return;
      }
      
      // Get coordinates
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      console.log(`Location coordinates: ${lat}, ${lng}`);
      
      // Extract address components
      let addressData = {
        address: place.formatted_address || "",
        city: "",
        state: "",
        pincode: "",
        latitude: lat,
        longitude: lng,
      };
      
      // Extract city, state, postal_code from address_components
      if (place.address_components && Array.isArray(place.address_components)) {
        place.address_components.forEach(component => {
          if (!component || !component.types || !Array.isArray(component.types)) {
            return;
          }
          
          const types = component.types;
          
          if (types.includes("locality")) {
            addressData.city = component.long_name || "";
          }
          
          if (types.includes("administrative_area_level_1")) {
            addressData.state = component.long_name || "";
          }
          
          if (types.includes("postal_code")) {
            addressData.pincode = component.long_name || "";
          }
        });
      }
      
      console.log("Extracted address data:", addressData);
      
      // Update form data with location details
      setFormData(prev => ({
        ...prev,
        address: addressData.address,
        city: addressData.city || prev.city,
        state: addressData.state || prev.state,
        pincode: addressData.pincode || prev.pincode,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
      }));
      
      toast.success("Location selected successfully");
    } catch (error) {
      console.error("Error handling place selection:", error);
      toast.error("Error selecting location");
    }
  };

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
      if (!sellerData || !sellerData.id) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const result = await updateSellerDetails(sellerData.id, formData);

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
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-background-alt border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm text-text-muted">
            <Link href="/seller/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <FiChevronRight className="mx-2 text-white" />
            <span className="text-text-dark">My Profile</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-background-card rounded-lg shadow-md p-4 sm:p-6 border border-ui-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-2xl font-bold text-text-dark flex items-center">
              <span className="bg-secondary bg-opacity-20 text-secondary p-2 rounded-full mr-3">
                <FiUser className="w-6 h-6 stroke-2 text-white" />
              </span>
              Seller Profile
            </h1>
            <div className="flex flex-wrap gap-3">
              {isEditing ? (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-ui-border rounded-md hover:bg-background-alt transition-colors text-text-dark w-full sm:w-auto"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors flex items-center justify-center w-full sm:w-auto"
                >
                  <FiEdit className="mr-2" />
                  Edit Profile
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-error text-error rounded-md hover:bg-error hover:bg-opacity-10 transition-colors flex items-center justify-center w-full sm:w-auto"
              >
                <FiLogOut className="mr-2" />
                Logout
              </button>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    ref={addressInputRef}
                    className="w-full p-3 pl-10 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                    placeholder="Start typing your address for suggestions"
                  />
                  <FiMapPin className="absolute left-3 top-3 text-text-muted" />
                </div>
                {!mapsLoaded && isEditing && (
                  <p className="mt-1 text-xs text-text-muted">Loading location suggestions...</p>
                )}
                {formData.latitude && formData.longitude && (
                  <p className="mt-1 text-xs text-accent">
                    Location coordinates captured successfully
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">
                  GST Number{" "}
                  <span className="text-text-muted text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    name="openTime"
                    value={formData.openTime}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    name="closeTime"
                    value={formData.closeTime}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-secondary text-white px-6 py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">
                    Phone Number
                  </h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.phone}
                  </p>
                </div>
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">
                    Joined On
                  </h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.createdAt
                      ? new Date(sellerData.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">
                    Shop Name
                  </h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.shopName || "Not set"}
                  </p>
                </div>
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">
                    Owner Name
                  </h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.ownerName || "Not set"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                <h2 className="text-sm font-medium text-text-muted">Address</h2>
                <p className="mt-1 text-lg font-medium text-text-dark">
                  {sellerData.address || "Not set"}
                </p>
                {sellerData.latitude && sellerData.longitude && (
                  <div className="mt-1 text-xs text-accent flex items-center gap-1">
                    <FiMapPin size={12} /> 
                    <span>Location coordinates: {sellerData.latitude.toFixed(6)}, {sellerData.longitude.toFixed(6)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">City</h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.city || "Not set"}
                  </p>
                </div>
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">State</h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.state || "Not set"}
                  </p>
                </div>
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">
                    Pincode
                  </h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.pincode || "Not set"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                <h2 className="text-sm font-medium text-text-muted">
                  GST Number
                </h2>
                <p className="mt-1 text-lg font-medium text-text-dark">
                  {sellerData.gstNumber || "Not set"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">
                    Opening Time
                  </h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.openTime || "Not set"}
                  </p>
                </div>
                <div className="p-4 bg-background-alt rounded-lg border border-ui-border">
                  <h2 className="text-sm font-medium text-text-muted">
                    Closing Time
                  </h2>
                  <p className="mt-1 text-lg font-medium text-text-dark">
                    {sellerData.closeTime || "Not set"}
                  </p>
                </div>
              </div>

              <div className="border-t border-ui-border pt-6 mt-8">
                <h2 className="text-lg font-medium text-text-dark mb-4">
                  Quick Links
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Link
                    href="/seller/dashboard"
                    className="flex items-center p-4 bg-background-alt rounded-lg border border-ui-border hover:shadow-md transition-shadow"
                  >
                    <div className="p-2 bg-primary bg-opacity-15 rounded-full text-primary mr-3">
                      <FiHome className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-dark">Dashboard</h3>
                      <p className="text-sm text-text-muted mt-1">
                        View your seller dashboard
                      </p>
                    </div>
                  </Link>
                  <Link
                    href="/seller/products"
                    className="flex items-center p-4 bg-background-alt rounded-lg border border-ui-border hover:shadow-md transition-shadow"
                  >
                    <div className="p-2 bg-primary bg-opacity-15 rounded-full text-primary mr-3">
                      <FiPackage className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-dark">Products</h3>
                      <p className="text-sm text-text-muted mt-1">
                        Manage your product listings
                      </p>
                    </div>
                  </Link>
                  <Link
                    href="/seller/orders"
                    className="flex items-center p-4 bg-background-alt rounded-lg border border-ui-border hover:shadow-md transition-shadow"
                  >
                    <div className="p-2 bg-primary bg-opacity-15 rounded-full text-primary mr-3">
                      <FiShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-dark">Orders</h3>
                      <p className="text-sm text-text-muted mt-1">
                        View and manage your orders
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap the profile content with the ProtectedRoute component
export default function SellerProfile() {
  return (
    <ProtectedRoute requireOnboarding={false}>
      <ProfileContent />
    </ProtectedRoute>
  );
}
