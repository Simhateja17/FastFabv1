import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * A centralized location store using Zustand with persistence
 * 
 * This store:
 * 1. Persists location data to localStorage automatically
 * 2. Provides methods to update/check location
 * 3. Handles location validation
 * 4. Tracks when a location was last set
 */
export const useLocationStore = create(
  persist(
    (set, get) => ({
      // Location data
      userLocation: null,  // Will contain {latitude, longitude, label, source, timestamp}
      isLocationSet: false, // Flag to track if location has been explicitly set by user
      lastUpdated: null,    // ISO timestamp of last update
      
      // Loading state
      loading: false,
      error: null,
      
      // Updates user location and sets appropriate flags
      setUserLocation: (locationData) => {
        if (!locationData || !locationData.latitude || !locationData.longitude) {
          console.error("Invalid location data:", locationData);
          set({ error: "Invalid location data provided" });
          return false;
        }
        
        // Include timestamp if not provided
        const updatedLocationData = {
          ...locationData,
          timestamp: locationData.timestamp || new Date().toISOString()
        };
        
        // Update the store
        set({
          userLocation: updatedLocationData,
          isLocationSet: true,
          lastUpdated: new Date().toISOString(),
          error: null
        });
        
        console.log("Location store updated:", updatedLocationData);
        
        // IMPORTANT: Also update localStorage directly as fallback for page reloads
        // This ensures consistency between store and localStorage
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem("userLocation", JSON.stringify(updatedLocationData));
            localStorage.setItem("locationLastUpdated", new Date().toISOString());
            console.log("Location written to localStorage as backup");
          }
        } catch (err) {
          console.error("Failed to write location to localStorage:", err);
        }
        
        return true;
      },
      
      // Clear location data
      clearUserLocation: () => {
        set({
          userLocation: null,
          isLocationSet: false,
          lastUpdated: new Date().toISOString(),
          error: null
        });
        
        // Also clear localStorage backup
        if (typeof window !== 'undefined') {
          localStorage.removeItem("userLocation");
          localStorage.removeItem("locationLastUpdated");
        }
        
        return true;
      },
      
      // Check if location is valid and available
      hasValidLocation: () => {
        const state = get();
        return (
          state.isLocationSet && 
          state.userLocation && 
          typeof state.userLocation.latitude === 'number' && 
          typeof state.userLocation.longitude === 'number'
        );
      },
      
      // Validate and potentially refresh location state
      validateLocation: () => {
        const state = get();
        
        // First fix if we have location data but isLocationSet is false
        if (state.userLocation?.latitude && state.userLocation?.longitude && !state.isLocationSet) {
          set({ isLocationSet: true });
        }
        
        // Check if there's newer location data in localStorage than in our store
        if (typeof window !== 'undefined') {
          try {
            const lsTimestamp = localStorage.getItem("locationLastUpdated");
            const storeTimestamp = state.lastUpdated;
            
            // If localStorage has newer timestamp, prefer that data
            if (lsTimestamp && (!storeTimestamp || new Date(lsTimestamp) > new Date(storeTimestamp))) {
              console.log("Found newer location data in localStorage");
              const lsLocationData = JSON.parse(localStorage.getItem("userLocation"));
              
              if (lsLocationData?.latitude && lsLocationData?.longitude) {
                console.log("Updating store with newer location from localStorage:", lsLocationData);
                set({
                  userLocation: lsLocationData,
                  isLocationSet: true,
                  lastUpdated: lsTimestamp,
                  error: null
                });
                return true;
              }
            }
          } catch (err) {
            console.error("Error checking localStorage for newer location data:", err);
          }
        }
        
        return state.isLocationSet && state.userLocation;
      }
    }),
    {
      name: 'fastfab-location-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Singleton to get location without hooks for use in non-React code
export const LocationStore = {
  getLocation: () => useLocationStore.getState().userLocation,
  hasValidLocation: () => useLocationStore.getState().hasValidLocation(),
  setLocation: (locationData) => useLocationStore.getState().setUserLocation(locationData)
};

// Initialize from existing localStorage data for backward compatibility
if (typeof window !== 'undefined') {
  try {
    // Immediate location check on import
    const existingLocation = localStorage.getItem("userLocation");
    if (existingLocation) {
      const locationData = JSON.parse(existingLocation);
      
      if (locationData.latitude && locationData.longitude) {
        // Only set if we have location data in localStorage and it's valid
        const store = useLocationStore.getState();
        
        // Force update if localStorage has valid location and:
        // - store doesn't have valid location OR
        // - localStorage has data with a newer timestamp
        if (!store.hasValidLocation() || 
            (locationData.timestamp && (!store.lastUpdated || new Date(locationData.timestamp) > new Date(store.lastUpdated)))) {
          console.log("Setting location from localStorage:", locationData);
          useLocationStore.getState().setUserLocation(locationData);
        } else {
          console.log("Store already has same or newer location data");
        }
      }
    }
  } catch (error) {
    console.error("Error migrating existing location data:", error);
  }
} 