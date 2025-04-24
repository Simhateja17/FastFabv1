"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocationStore } from "@/app/lib/locationStore";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { FiMapPin, FiAlertCircle } from "react-icons/fi";

export default function LocationPermissionHandler({ children }) {
  const { userLocation, setUserLocation } = useLocationStore();
  const { user } = useUserAuth();
  const [locationStatus, setLocationStatus] = useState("checking"); // checking, allowed, denied, blocked
  const [showModal, setShowModal] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);

  // Requests browser location permission
  const requestLocationPermission = useCallback(() => {
    setLocationRequested(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Use Google Maps Geocoding API to get detailed address (if available)
          if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            const latlng = { lat: latitude, lng: longitude };
            
            geocoder.geocode({ location: latlng }, (results, status) => {
              if (status === "OK" && results[0]) {
                // Get detailed address information
                const formattedAddress = results[0].formatted_address;
                const addressComponents = results[0].address_components;
                
                // Extract specific address components like street, city, etc.
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
                
                // Create display address for navbar
                const displayAddress = street || (city ? `${city}` : formattedAddress.split(',')[0]);
                
                // Create full location object with detailed address
                const locationData = {
                  latitude,
                  longitude,
                  label: displayAddress, // Use detailed street/area name instead of "Current Location"
                  fullAddress: formattedAddress, // Store full address for checkout page
                  addressComponents: {
                    street,
                    city,
                    state,
                    country,
                    postalCode
                  },
                  source: "browser",
                  timestamp: new Date().toISOString()
                };
                
                // Update location in store
                setUserLocation(locationData);
                localStorage.setItem("locationSet", "true");
                setLocationStatus("allowed");
              } else {
                // Fallback to basic location if geocoding fails
                const locationData = {
                  latitude,
                  longitude,
                  label: "Current Location",
                  source: "browser",
                  timestamp: new Date().toISOString()
                };
                
                setUserLocation(locationData);
                localStorage.setItem("locationSet", "true");
                setLocationStatus("allowed");
              }
            });
          } else {
            // Fallback if Google Maps API isn't available
            const locationData = {
              latitude,
              longitude,
              label: "Current Location",
              source: "browser",
              timestamp: new Date().toISOString()
            };
            
            // Update location in store
            setUserLocation(locationData);
            localStorage.setItem("locationSet", "true");
            setLocationStatus("allowed");
          }
        },
        // Error callback
        (error) => {
          console.log("Geolocation error:", error);
          
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus("denied");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setLocationStatus("blocked");
          } else {
            setLocationStatus("error");
          }
          
          // Show modal to manually set location
          setShowModal(true);
        },
        // Options for getCurrentPosition
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Geolocation not supported by browser - only in this branch
      setLocationStatus("unsupported");
      setShowModal(true);
    }
  }, [setUserLocation]);

  // Check if this is a new user (no prior visits)
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem("hasVisitedBefore");
    const locationSet = localStorage.getItem("locationSet");
    
    // If user has set their location previously, don't do anything
    if (locationSet === "true" || userLocation) {
      setLocationStatus("allowed");
      return;
    }

    // If this is a first-time visitor or returning user without location
    if (!hasVisitedBefore || (!locationSet && !userLocation)) {
      // Mark as visited
      localStorage.setItem("hasVisitedBefore", "true");
      
      // If they haven't been asked for permission yet
      if (!locationRequested) {
        requestLocationPermission();
      }
    }
  }, [userLocation, locationRequested, requestLocationPermission]);

  // Call this when user clicks the location modal trigger
  const handleOpenLocationModal = () => {
    // Find and click the location selector button in the navbar
    document.querySelector('[data-location-trigger]')?.click();
    setShowModal(false);
  };

  // If location is allowed, render children normally
  if (locationStatus === "allowed" || (userLocation && userLocation.latitude && userLocation.longitude)) {
    return children;
  }

  // If modal is showing, render warning with location modal button
  if (showModal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <FiMapPin className="w-16 h-16 mx-auto text-primary mb-4" />
          
          <h2 className="text-2xl font-bold mb-4">Set Your Location</h2>
          
          <p className="mb-6 text-gray-600">
            We need your location to show you products available in your area.
          </p>
          
          <div className="flex flex-col space-y-4">
            <button
              onClick={handleOpenLocationModal}
              className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Set Location Manually
            </button>
            
            {locationStatus === "denied" && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-100 text-left">
                <div className="flex items-start">
                  <FiAlertCircle className="text-amber-500 mt-1 mr-3 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    You&apos;ve denied location access. Please set your location manually or enable location services in your browser settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // During initial checking, show a minimal loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Checking location...</p>
    </div>
  );
} 