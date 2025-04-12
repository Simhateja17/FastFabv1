import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    (set) => ({
      userLocation: null,
      locationEnabled: false,
      
      // Set user location
      setUserLocation: (location) => {
        console.log('LocationStore: Setting user location', location);
        
        // Also set the flag when the location is set programmatically
        if (typeof window !== 'undefined') {
          localStorage.setItem("locationSet", "true");
        }
        
        return set({ 
          userLocation: location,
          locationEnabled: true
        });
      },
      
      // Clear user location
      clearUserLocation: () => {
        console.log('LocationStore: Clearing user location');
        
        // Also clear the flag
        if (typeof window !== 'undefined') {
          localStorage.removeItem("locationSet");
        }
        
        return set({ 
          userLocation: null,
          locationEnabled: false 
        });
      },
      
      // Toggle location enabled/disabled
      toggleLocationEnabled: () => set((state) => ({ 
        locationEnabled: !state.locationEnabled 
      })),
      
      // Check if location is set
      isLocationSet: () => {
        const state = useLocationStore.getState();
        const result = !!(state.userLocation?.latitude && state.userLocation?.longitude && state.locationEnabled);
        console.log('LocationStore: Checking if location is set', result);
        return result;
      },
    }),
    {
      name: 'user-location', // unique name for localStorage
    }
  )
);

// Singleton to get location without hooks for use in non-React code
export const LocationStore = {
  getLocation: () => useLocationStore.getState().userLocation,
  hasValidLocation: () => useLocationStore.getState().isLocationSet(),
  setLocation: (locationData) => useLocationStore.getState().setUserLocation(locationData)
};

// Initialize from existing localStorage data for backward compatibility
if (typeof window !== 'undefined') {
  try {
    // Check for both flags
    const locationSet = localStorage.getItem("locationSet");
    console.log('LocationStore init: locationSet flag =', locationSet);
    
    // Immediate location check on import
    const existingLocation = localStorage.getItem("userLocation");
    if (existingLocation) {
      console.log('LocationStore init: Found existing location in localStorage');
      
      try {
        const locationData = JSON.parse(existingLocation);
        
        if (locationData.latitude && locationData.longitude) {
          // Only set if we have location data in localStorage and it's valid
          const store = useLocationStore.getState();
          
          // Force update if localStorage has valid location and:
          // - store doesn't have valid location OR
          // - localStorage has data with a newer timestamp
          if (!store.isLocationSet() || 
              (locationData.timestamp && (!store.userLocation || new Date(locationData.timestamp) > new Date(store.userLocation.timestamp)))) {
            console.log("LocationStore init: Setting location from localStorage:", locationData);
            useLocationStore.getState().setUserLocation(locationData);
          } else {
            console.log("LocationStore init: Store already has same or newer location data");
          }
        }
      } catch (parseError) {
        console.error("LocationStore init: Error parsing location data:", parseError);
      }
    } else {
      console.log('LocationStore init: No existing location in localStorage');
    }
  } catch (error) {
    console.error("LocationStore init: Error migrating existing location data:", error);
  }
} 