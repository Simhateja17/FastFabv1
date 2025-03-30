"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useUserAuth } from "./UserAuthContext";

// Create context with default values to prevent "undefined" errors
const LocationContext = createContext({
  userLocation: null,
  loading: false,
  error: null,
  updateUserLocation: () => {
    console.warn("LocationProvider not initialized");
    return false;
  },
  clearUserLocation: () => {
    console.warn("LocationProvider not initialized");
    return false;
  }
});

export function LocationProvider({ children }) {
  const { user } = useUserAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Try to get user location either from localStorage or user's address
  useEffect(() => {
    const loadUserLocation = async () => {
      try {
        setLoading(true);
        
        // First check if we have a cached location in localStorage
        const cachedLocation = localStorage.getItem("userLocation");
        
        if (cachedLocation) {
          try {
            const parsedLocation = JSON.parse(cachedLocation);
            console.log("Using cached location from localStorage:", parsedLocation);
            setUserLocation(parsedLocation);
            setLoading(false);
            return;
          } catch (e) {
            console.error("Error parsing cached location:", e);
            localStorage.removeItem("userLocation");
          }
        }
        
        // If user is logged in, try to get their default address location
        if (user?.id) {
          try {
            // Fetch user's addresses from API
            const response = await fetch('/api/user/address', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('userAccessToken')}`,
                'X-User-Token': localStorage.getItem('userAccessToken') || '',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              const addresses = data.data?.addresses || [];
              
              // Look for default address with coordinates
              const defaultAddress = addresses.find(addr => 
                addr.isDefault && addr.latitude && addr.longitude
              );
              
              if (defaultAddress) {
                const locationData = {
                  latitude: defaultAddress.latitude,
                  longitude: defaultAddress.longitude,
                  label: defaultAddress.city || "Saved Location",
                  source: "address"
                };
                
                console.log("Using location from default address:", locationData);
                setUserLocation(locationData);
                localStorage.setItem("userLocation", JSON.stringify(locationData));
                setLoading(false);
                return;
              }
            }
          } catch (addressError) {
            console.error("Error fetching user addresses:", addressError);
          }
        }
        
        // If we reached here, we couldn't get location from cache or user data
        setUserLocation(null);
        setLoading(false);
        
      } catch (error) {
        console.error("Error loading user location:", error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    loadUserLocation();
  }, [user]);
  
  // Update user location and save to localStorage
  const updateUserLocation = (locationData) => {
    if (!locationData || !locationData.latitude || !locationData.longitude) {
      console.error("Invalid location data:", locationData);
      return false;
    }
    
    console.log("Updating user location:", locationData);
    setUserLocation(locationData);
    
    // Cache in localStorage for future sessions
    localStorage.setItem("userLocation", JSON.stringify(locationData));
    
    // If user is logged in, also store in database
    if (user?.id) {
      storeLocationInDatabase(locationData);
    }
    
    return true;
  };
  
  // Store location in database for logged in users
  const storeLocationInDatabase = async (locationData) => {
    try {
      // Store as coordinate point
      const response = await fetch('/api/user/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userAccessToken')}`,
          'X-User-Token': localStorage.getItem('userAccessToken') || '',
        },
        body: JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        }),
      });
      
      if (!response.ok) {
        console.error("Failed to store location in database:", await response.text());
      }
    } catch (error) {
      console.error("Error storing location in database:", error);
    }
  };
  
  // Clear user location
  const clearUserLocation = () => {
    setUserLocation(null);
    localStorage.removeItem("userLocation");
    return true;
  };
  
  return (
    <LocationContext.Provider 
      value={{ 
        userLocation, 
        loading, 
        error, 
        updateUserLocation, 
        clearUserLocation 
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

// Updated useLocation hook that always returns a valid context object
export function useLocation() {
  return useContext(LocationContext);
} 