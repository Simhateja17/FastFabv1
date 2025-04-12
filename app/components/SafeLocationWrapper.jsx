"use client";

import { useLocationStore } from '@/app/lib/locationStore';

/**
 * A higher-order component that safely provides location functionality to components
 * that need to use the LocationContext.
 * 
 * This component:
 * 1. Ensures the component always has access to location data
 * 2. Provides a consistent API regardless of context availability
 * 3. Uses the centralized location store instead of context
 */
export default function SafeLocationWrapper({ children }) {
  // Use location store directly for better consistency
  const userLocation = useLocationStore(state => state.userLocation);
  const locationEnabled = useLocationStore(state => state.locationEnabled);
  const setUserLocation = useLocationStore(state => state.setUserLocation);
  
  // Debug logs
  if (userLocation) {
    console.log('SafeLocationWrapper: Providing location data to child components', 
      {lat: userLocation.latitude, lng: userLocation.longitude, enabled: locationEnabled});
  }
  
  return children({
    userLocation,
    loading: false, // We no longer need loading with the store
    updateUserLocation: setUserLocation
  });
}

/**
 * A component that safely uses location data
 * This is an example of how to use the SafeLocationWrapper
 * 
 * Usage:
 * <SafeLocationConsumer>
 *   {({ userLocation, updateUserLocation }) => (
 *     // Your component using location data
 *   )}
 * </SafeLocationConsumer>
 */
export function SafeLocationConsumer({ children }) {
  return (
    <SafeLocationWrapper>
      {(locationContext) => children(locationContext)}
    </SafeLocationWrapper>
  );
} 