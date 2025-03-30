"use client";

import { useState, useRef, useEffect } from "react";
import { FiMapPin, FiX } from "react-icons/fi";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { SafeLocationConsumer } from "./SafeLocationWrapper";
import { USER_ENDPOINTS } from "@/app/config";

// Main component with minimal hooks
const LocationModal = ({ isOpen, onClose, setCurrentLocation }) => {
  // Only return early, no hooks before this point
  if (!isOpen) return null;

  // Render the SafeLocationConsumer, passing context to inner component
  return (
    <SafeLocationConsumer>
      {(locationContext) => (
        <LocationModalContent 
          isOpen={isOpen} 
          onClose={onClose} 
          setCurrentLocation={setCurrentLocation} 
          locationContext={locationContext}
        />
      )}
    </SafeLocationConsumer>
  );
};

// Inner component that handles all the hooks in a consistent order
function LocationModalContent({ isOpen, onClose, setCurrentLocation, locationContext }) {
  // Extract methods from context safely - now we know context will always have these properties
  // thanks to our default context values
  const { updateUserLocation } = locationContext || {};
  
  // Safety check to ensure we update localStorage even if context methods fail
  const safeUpdateLocation = (locationData) => {
    let success = false;
    
    // Try to use the context method first
    if (typeof updateUserLocation === 'function') {
      try {
        success = updateUserLocation(locationData);
      } catch (err) {
        console.error("Error calling updateUserLocation:", err);
      }
    }
    
    // If context method failed or isn't available, fall back to localStorage
    if (!success) {
      console.warn("Using localStorage fallback for location storage");
      try {
        localStorage.setItem("userLocation", JSON.stringify(locationData));
        success = true;
      } catch (err) {
        console.error("Failed to store location in localStorage:", err);
      }
    }
    
    return success;
  };
  
  // All hooks are called unconditionally in the same order every time
  const { user } = useUserAuth();
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapsScriptLoaded, setMapsScriptLoaded] = useState(false);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Function to store user location coordinates
  const storeUserLocation = async (userId, latitude, longitude) => {
    try {
      // Make API call to store coordinates
      console.log(`Storing location for user ${userId}: lat ${latitude}, lng ${longitude}`);
      
      // Get authentication tokens from localStorage
      const accessToken = localStorage.getItem('userAccessToken');
      const refreshToken = localStorage.getItem('userRefreshToken');
      
      const response = await fetch(USER_ENDPOINTS.LOCATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'X-User-Token': accessToken || '',
          'X-Refresh-Token': refreshToken || '',
        },
        body: JSON.stringify({
          latitude,
          longitude
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Location stored successfully:', data);
      } else {
        console.error('Failed to store location:', data.message);
      }
    } catch (error) {
      console.error('Error storing user location:', error);
    }
  };
  
  // Function to store complete user address
  const storeUserAddress = async (userId, addressData) => {
    try {
      // Make API call to store address
      console.log(`Storing address for user ${userId}:`, addressData);
      
      // Get authentication tokens from localStorage
      const accessToken = localStorage.getItem('userAccessToken');
      const refreshToken = localStorage.getItem('userRefreshToken');
      
      const response = await fetch(USER_ENDPOINTS.ADDRESS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'X-User-Token': accessToken || '',
          'X-Refresh-Token': refreshToken || '',
        },
        body: JSON.stringify(addressData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Address stored successfully:', data);
      } else {
        console.error('Failed to store address:', data.message);
      }
    } catch (error) {
      console.error('Error storing user address:', error);
    }
  };
  
  // Load Google Maps API and initialize autocomplete
  useEffect(() => {
    if (!isOpen) return;
    
    const checkGoogleMapsLoaded = () => {
      // Check if Google Maps API is already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        setMapsScriptLoaded(true);
        return true;
      }
      return false;
    };
    
    // If already loaded, set the state directly
    if (checkGoogleMapsLoaded()) {
      return;
    }
    
    // If not loaded yet, set up an interval to check
    const intervalId = setInterval(() => {
      if (checkGoogleMapsLoaded()) {
        clearInterval(intervalId);
      }
    }, 300);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [isOpen]);
  
  // Initialize autocomplete when maps script is loaded
  useEffect(() => {
    if (!isOpen || !mapsScriptLoaded || !searchInputRef.current) return;
    
    try {
      // Create autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        { types: ['geocode', 'establishment'] }
      );
      
      // Add listener for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (!place.geometry || !place.geometry.location) {
          console.error("No geometry available for this place");
          return;
        }
        
        const latitude = place.geometry.location.lat();
        const longitude = place.geometry.location.lng();
        
        console.log('Selected place:', place);
        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
        
        // Update location context with new location
        const locationName = place.name || place.formatted_address.split(",")[0];
        
        // Use our safer update method
        safeUpdateLocation({
          latitude,
          longitude,
          label: locationName,
          source: "placeSearch",
          timestamp: new Date().toISOString()
        });

        // Set the selected location
        setCurrentLocation(locationName);
        onClose();
      });
    } catch (error) {
      console.error("Error initializing Google Places Autocomplete:", error);
    }

    // Cleanup function
    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isOpen, mapsScriptLoaded, setCurrentLocation, onClose, updateUserLocation, safeUpdateLocation]);

  // Handle input changes without interfering with Google autocomplete
  const handleInputChange = (e) => {
    setSearchValue(e.target.value);
    // Don't manipulate the DOM directly as Google's autocomplete needs to work with it
  };
  
  // Get current location using browser geolocation
  const handleCurrentLocation = () => {
    if (!mapsScriptLoaded) {
      alert("Maps API is still loading. Please try again in a moment.");
      return;
    }
    
    setLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          
          console.log(`Current location: Lat ${latitude}, Lng ${longitude}`);
          
          // Use reverse geocoding to get address
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            setLoading(false);
            
            if (status === 'OK' && results[0]) {
              console.log('Geocoder results:', results);
              
              // Use the first result as the location name, usually the formatted address
              const locationName = results[0].formatted_address.split(',')[0];
              console.log("Current location detected:", locationName);
              setCurrentLocation(locationName);
              
              // Also store the full address information if user is logged in
              if (user?.id) {
                const addressData = {
                  line1: results[0].formatted_address,
                  city: '',
                  state: '',
                  pincode: '',
                  name: 'Current Location',
                  phone: user.phone || '',
                  latitude,
                  longitude
                };
                
                // Extract address components
                results[0].address_components.forEach(component => {
                  if (component.types.includes("locality")) {
                    addressData.city = component.long_name;
                  } else if (component.types.includes("administrative_area_level_1")) {
                    addressData.state = component.long_name;
                  } else if (component.types.includes("postal_code")) {
                    addressData.pincode = component.long_name;
                  }
                });
                
                console.log("Storing complete address:", addressData);
                storeUserAddress(user.id, addressData);
              }
              
              // Update location context with new location using our safer method
              safeUpdateLocation({
                latitude,
                longitude,
                label: locationName,
                source: "currentLocation",
                timestamp: new Date().toISOString()
              });
              
              onClose();
            } else {
              console.error("Geocoder failed due to: " + status);
              setCurrentLocation("Location error");
            }
          });
        },
        (error) => {
          setLoading(false);
          console.error("Error getting current location:", error);
          alert("Unable to get your current location. Please check your browser permissions.");
        }
      );
    } else {
      setLoading(false);
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Render the UI
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <FiX className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-semibold mb-4">Your Location</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1">
            Search for a location
          </label>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              placeholder="Enter your location"
              disabled={!mapsScriptLoaded}
              className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary pl-10"
            />
            <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
          </div>
          {!mapsScriptLoaded && (
            <p className="text-xs text-text-muted mt-1">Loading maps...</p>
          )}
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center text-primary mb-2">
            <div className="w-8 h-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-2">
              <FiMapPin className="text-primary" />
            </div>
            <h3 className="font-medium">Current Location</h3>
          </div>
          <p className="text-sm text-gray-500 ml-10 mb-3">
            Enable your current location for better services
          </p>
          <button
            onClick={handleCurrentLocation}
            disabled={loading || !mapsScriptLoaded}
            className="ml-10 px-4 py-1 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationModal; 