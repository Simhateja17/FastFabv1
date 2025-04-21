"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useUserAuth } from "./UserAuthContext";
import { useAuth } from "./AuthContext";

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
  const { seller, authFetch, isInitialized: isAuthInitialized } = useAuth();
  const userId = seller?._id;
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Try to get user location either from localStorage or user's address
  useEffect(() => {
    // Only run after AuthContext is initialized
    if (!isAuthInitialized) {
      console.log("[LocationContext] Waiting for AuthContext to initialize...");
      // Set loading false only if auth is initialized and no user ID exists
      // Otherwise, wait for the fetch attempt
      if (!userId) setLoading(false);
      return; 
    }

    const loadUserLocation = async () => {
      try {
        setLoading(true);
        console.log("[LocationContext] Auth initialized, proceeding to load location...");
        
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
        if (userId && authFetch) {
          try {
            console.log(`[LocationContext] Fetching address for user ID: ${userId}`);
            // Fetch user's addresses from API using authFetch
            const response = await authFetch('/api/user/address');
            
            if (response.ok) {
              const data = await response.json();
              // Adjust data path based on actual API response structure
              const addresses = data.data || []; 
              
              // Look for default address with coordinates
              const defaultAddress = addresses.find(addr => 
                addr.is_default && // Assuming snake_case from API
                addr.location?.coordinates?.length === 2
              );
              
              if (defaultAddress) {
                const locationData = {
                  latitude: defaultAddress.location.coordinates[1], // Lat is typically second
                  longitude: defaultAddress.location.coordinates[0], // Lng is typically first
                  label: defaultAddress.city || "Saved Location",
                  source: "address"
                };
                
                console.log("[LocationContext] Using location from default address:", locationData);
                setUserLocation(locationData);
                localStorage.setItem("userLocation", JSON.stringify(locationData));
                setLoading(false);
                return;
              } else {
                console.log("[LocationContext] No default address with coordinates found.");
              }
            } else {
              console.error(`[LocationContext] Failed to fetch addresses: ${response.status}`);
              // Don't set error here if it was just a 401 handled by authFetch
              if (response.status !== 401 && response.status !== 0) { 
                  setError(`Failed to fetch addresses: ${response.status}`);
              }
            }
          } catch (addressError) {
            console.error("[LocationContext] Error fetching/processing user addresses:", addressError);
            // Avoid setting generic error if authFetch handled logout
            if (!(addressError.message.includes("Authentication required") || addressError.message.includes("Session expired"))) {
                setError(addressError.message);
            }
          }
        }
        
        // If we reached here, we couldn't get location from cache or user data
        console.log("[LocationContext] No location found from cache or address.");
        setUserLocation(null);
        setLoading(false);
        
      } catch (error) {
        console.error("[LocationContext] Error loading user location:", error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    loadUserLocation();
  }, [userId, authFetch, isAuthInitialized]);
  
  // Update user location and save to localStorage
  const updateUserLocation = useCallback((locationData) => {
    if (!locationData || !locationData.latitude || !locationData.longitude) {
      console.error("Invalid location data:", locationData);
      return false;
    }
    
    console.log("Updating user location:", locationData);
    setUserLocation(locationData);
    
    // Cache in localStorage for future sessions
    localStorage.setItem("userLocation", JSON.stringify(locationData));
    
    // If user is logged in, also store in database using authFetch
    if (userId && authFetch) {
      storeLocationInDatabase(locationData, authFetch);
    }
    
    return true;
  }, [userId, authFetch]);
  
  // Store location in database for logged in users
  const storeLocationInDatabase = useCallback(async (locationData, fetcher) => {
    try {
      // Store as coordinate point using the provided fetcher (authFetch)
      const response = await fetcher('/api/seller/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header is handled by authFetch
        },
        body: JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        }),
      });
      
      if (!response.ok) {
        console.error("Failed to store location in database:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Error storing location in database:", error);
    }
  }, []);
  
  // Clear user location
  const clearUserLocation = useCallback(() => {
    setUserLocation(null);
    localStorage.removeItem("userLocation");
    return true;
  }, []);
  
  // Memoize context value
  const value = useMemo(() => ({
    userLocation,
    loading,
    error,
    updateUserLocation,
    clearUserLocation
  }), [userLocation, loading, error, updateUserLocation, clearUserLocation]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

// Updated useLocation hook that always returns a valid context object
export function useLocation() {
  return useContext(LocationContext);
} 