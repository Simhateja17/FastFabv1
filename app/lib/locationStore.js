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
      setUserLocation: (location) => set({ 
        userLocation: location,
        locationEnabled: true
      }),
      
      // Clear user location
      clearUserLocation: () => set({ 
        userLocation: null,
        locationEnabled: false 
      }),
      
      // Toggle location enabled/disabled
      toggleLocationEnabled: () => set((state) => ({ 
        locationEnabled: !state.locationEnabled 
      })),
      
      // Check if location is set
      isLocationSet: () => {
        const state = useLocationStore.getState();
        return !!(state.userLocation?.latitude && state.userLocation?.longitude && state.locationEnabled);
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
        if (!store.isLocationSet() || 
            (locationData.timestamp && (!store.userLocation || new Date(locationData.timestamp) > new Date(store.userLocation.timestamp)))) {
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