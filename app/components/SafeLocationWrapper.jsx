"use client";

import { useLocation } from '@/app/context/LocationContext';

/**
 * A higher-order component that safely provides location functionality to components
 * that need to use the LocationContext.
 * 
 * This component:
 * 1. Ensures the component always has access to location context
 * 2. Provides a consistent API regardless of context availability
 * 3. Eliminates "useLocation must be used within LocationProvider" errors
 */
export default function SafeLocationWrapper({ children }) {
  // Simply forward the location context to children
  // Since we updated LocationContext to always provide default values,
  // there's no need for try/catch or conditional hook calls
  const locationContext = useLocation();
  return children(locationContext);
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