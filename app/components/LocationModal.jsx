"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FiMapPin, FiX } from "react-icons/fi";
import { useUserAuth } from "@/app/context/UserAuthContext";
// Remove SafeLocationConsumer import if it's not used elsewhere
// import { SafeLocationConsumer } from "./SafeLocationWrapper"; 
import { USER_ENDPOINTS } from "@/app/config";
import { useLocationStore } from "@/app/lib/locationStore";

// Main component doesn't need isOpen or setCurrentLocation anymore
const LocationModal = ({ onClose }) => {
  // The parent component (Navbar) already controls rendering.
  return <LocationModalContent onClose={onClose} />;
};

// Inner component that handles all the hooks in a consistent order
function LocationModalContent({ onClose }) {
  // Use location store instead of context
  const setUserLocation = useLocationStore(state => state.setUserLocation);
  
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
  
  // Load Google Maps API and initialize autocomplete
  useEffect(() => {
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
  }, []);
  
  // Initialize autocomplete when maps script is loaded
  useEffect(() => {
    if (!mapsScriptLoaded || !searchInputRef.current) return;
    
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
        
        // Create a complete location object with all necessary data
        const newLocationData = {
          latitude,
          longitude,
          label: locationName,
          // Add fullAddress for manually typed addresses
          fullAddress: place.formatted_address || place.name,
          // Add address components if available
          addressComponents: {
            street: '',
            city: '',
            state: '',
            country: '',
            postalCode: ''
          },
          source: "placeSearch",
          timestamp: new Date().toISOString()
        };
        
        // Extract address components if available
        if (place.address_components) {
          place.address_components.forEach(component => {
            const types = component.types;
            
            if (types.includes('route')) {
              newLocationData.addressComponents.street = component.long_name;
            } else if (types.includes('locality')) {
              newLocationData.addressComponents.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              newLocationData.addressComponents.state = component.long_name;
            } else if (types.includes('country')) {
              newLocationData.addressComponents.country = component.long_name;
            } else if (types.includes('postal_code')) {
              newLocationData.addressComponents.postalCode = component.long_name;
            }
          });
        }
        
        console.log("Setting new location:", newLocationData);
        
        // Use setUserLocation directly
        setUserLocation(newLocationData);
        console.log("Successfully updated location via store");

        // Set a flag to indicate location has been set by the user
        localStorage.setItem("locationSet", "true");
        
        // Remove the justLoggedIn flag to prevent the modal from showing again on refresh
        localStorage.removeItem("justLoggedIn");
        
        // Close the modal 
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
  }, [mapsScriptLoaded, onClose, setUserLocation]);

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
        // Success callback
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          
          console.log(`Current position: Latitude ${latitude}, Longitude ${longitude}`);
          
          // Reverse geocode to get a readable address
          const geocoder = new window.google.maps.Geocoder();
          const latlng = { lat: latitude, lng: longitude };
          
          geocoder.geocode({ location: latlng }, (results, status) => {
            setLoading(false); // Set loading false here regardless of outcome
            if (status === "OK" && results[0]) {
              // Get the readable address
              const formattedAddress = results[0].formatted_address;
              
              // Extract specific address components
              const addressComponents = results[0].address_components;
              let street = '', city = '', state = '', country = '', postalCode = '';
              
              addressComponents.forEach(component => {
                const types = component.types;
                
                if (types.includes('route')) {
                  street = component.long_name;
                } else if (types.includes('locality')) {
                  city = component.long_name;
                } else if (types.includes('administrative_area_level_1')) {
                  state = component.long_name;
                } else if (types.includes('country')) {
                  country = component.long_name;
                } else if (types.includes('postal_code')) {
                  postalCode = component.long_name;
                }
              });
              
              // Create display address for navbar (prefer street name or city)
              const displayAddress = street || (city ? `${city}` : formattedAddress.split(',')[0]);
              
              console.log(`Current location: ${formattedAddress}`);
              
              // Update location store with detailed information
              const locationData = {
                latitude,
                longitude,
                label: displayAddress, // Use street name or city instead of generic "Current Location"
                fullAddress: formattedAddress, // Store full address for checkout page
                addressComponents: {
                  street,
                  city,
                  state,
                  country,
                  postalCode
                },
                source: "geolocation",
                timestamp: new Date().toISOString()
              };
              setUserLocation(locationData);
              console.log("Successfully updated location via store (geolocation)");

              // Set flag after successful location update
              localStorage.setItem("locationSet", "true");

              // If user is logged in, store in the database
              if (user?.id) {
                storeUserLocation(user.id, latitude, longitude);
              }

              // Close modal 
              onClose();
            } else {
              console.error("Geocoder failed due to: " + status);
              alert("Failed to get your location address. Please try searching instead.");
            }
          });
        },
        // Error callback
        (error) => {
          console.error("Geolocation error:", error);
          setLoading(false);
          
          let message = "Unable to get your location.";
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              message = "Please enable location access in your browser settings to use this feature.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              message = "Request to get your location timed out.";
              break;
          }
          
          alert(message);
        },
        // Options
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setLoading(false);
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