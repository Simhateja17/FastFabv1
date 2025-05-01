"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "react-hot-toast";

import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function SellerOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputReady, setInputReady] = useState(false);

  const { seller, updateSellerDetails, authFetch, setSeller, fetchCurrentSellerProfile } = useAuth();
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

  // Verify authentication on page load
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Only refresh the profile if seller exists but skip if we're already loading
        if (seller && !loading) {
          console.log("Verifying authentication once on page load");
          await fetchCurrentSellerProfile();
          console.log("Authentication verified for onboarding");
        }
      } catch (error) {
        console.error("Authentication verification failed:", error);
        toast.error("Authentication error. Please sign in again.");
        router.push("/seller/signin");
      }
    };
    
    verifyAuth();
    // Only run this effect once on component mount using an empty dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure the address input element is ready
  useEffect(() => {
    // Check if the ref is set on mount
    if (addressInputRef.current) {
      console.log("Address input ref is ready on mount");
      setInputReady(true);
    }
  }, []);

  // Check if Google Maps API is loaded from root layout
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

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    // Only initialize when both Maps API is loaded and input is ready
    if (mapsLoaded && inputReady && addressInputRef.current) {
      try {
        console.log("Attempting to initialize Maps autocomplete");
        
        // Check if Google Maps API is fully loaded
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          console.error("Google Maps API not fully loaded");
          return;
        }
        
        // Directly use legacy Autocomplete for now 
        // (PlaceAutocompleteElement is causing compatibility issues)
        const options = {
          componentRestrictions: { country: "in" },
          fields: ["address_components", "formatted_address", "geometry"],
          // Include establishments like dental clinics, not just addresses
          types: ['establishment', 'geocode']
        };
        
        console.log("Creating autocomplete with options:", options);
        
        // Clear existing autocomplete if any
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
        
        // Create new autocomplete
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          options
        );
        
        console.log("Autocomplete created successfully");
        
        // Add listener for place selection
        autocompleteRef.current.addListener("place_changed", () => {
          console.log("Place selection detected");
          const place = autocompleteRef.current.getPlace();
          
          if (!place || !place.geometry) {
            console.warn("No place details available");
            return;
          }
          
          console.log("Place selected:", place);
          handlePlaceSelection(place);
        });
      } catch (error) {
        console.error("Error initializing Google Maps Autocomplete:", error);
      }
    }
  }, [mapsLoaded, inputReady]);
  
  // Extract the place selection logic to a separate function
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
      
      // Make sure address_components exists
      if (!place.address_components || !Array.isArray(place.address_components)) {
        console.warn("No address components found in place object");
      } else {
        // Extract city, state, postal_code from address_components
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
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
      }));
      
      console.log("Form data updated with place information");
    } catch (error) {
      console.error("Error handling place selection:", error);
    }
  };

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
        // Additional check - try to refresh profile first before failing
        try {
          const refreshedProfile = await fetchCurrentSellerProfile();
          if (!refreshedProfile) {
            throw new Error("Authentication required. Please sign in again.");
          }
        } catch (authError) {
          throw new Error("Authentication required. Please sign in again.");
        }
      }

      console.log("Submitting seller details with form data:", formData);
      
      // Don't call fetchCurrentSellerProfile here - it can cause issues
      
      const result = await updateSellerDetails(formData);
      console.log("Update profile response:", result);

      if (result.success) {
        // Check if a beneficiary ID was created
        if (result.seller?.cashfreeBeneficiaryId) {
          console.log("✅ Cashfree beneficiary ID created successfully:", result.seller.cashfreeBeneficiaryId);
          toast.success("Profile updated and payment account set up successfully!");
        } else {
          console.log("⚠️ Profile updated but no Cashfree beneficiary ID was created");
          toast.success("Profile updated successfully!");
        }
        
        // Set a flag to indicate onboarding is done
        sessionStorage.setItem('onboardingComplete', 'true');

        // Wait a moment before redirecting to ensure state is updated
        setTimeout(() => {
          // Force redirect to dashboard
          window.location.href = "/seller/dashboard";
        }, 500);
      } else {
        const errorMessage = result.error || "Failed to update profile";
        console.error("Profile update failed:", errorMessage);
        
        // Special handling for authentication errors
        if (errorMessage.includes("Not authenticated") || errorMessage.includes("401")) {
          toast.error("Authentication error. Please sign in again.");
          // Don't call setSeller, just redirect
          setTimeout(() => {
            router.push("/seller/signin");
          }, 1000);
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      
      // Check if it's an auth error
      if (error.message.includes("authentication") || error.message.includes("authenticated") || error.message.includes("401")) {
        toast.error("Authentication error. Please sign in again.");
        // Don't call setSeller, just redirect
        setTimeout(() => {
          router.push("/seller/signin");
        }, 1000);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Make sure the ref is captured on initial render
  const setAddressInputRef = useCallback(node => {
    console.log("Address input ref callback executed", node ? "with node" : "without node");
    if (node !== null) {
      addressInputRef.current = node;
      console.log("Address input ref set successfully");
      setInputReady(true);
    }
  }, []);

  if (!seller) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <LoadingSpinner size="large" color="secondary" />
      </div>
    );
  }

  return (
    <>
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
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                ref={setAddressInputRef}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                required
                placeholder="Start typing your address for suggestions"
              />
              {formData.latitude && formData.longitude && (
                <p className="mt-1 text-xs text-gray-500">
                  Location coordinates captured successfully
                </p>
              )}
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
                GST Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input"
                placeholder="Enter your 15-digit GST Number"
                maxLength={15}
                required
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

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 bg-secondary text-black rounded-md hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner size="small" color="white" />
                    <span className="ml-2">Saving...</span>
                  </span>
                ) : (
                  "Save & Continue"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
