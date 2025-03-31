"use client";

import { useState, useEffect } from 'react';
import { SafeLocationConsumer } from './SafeLocationWrapper';
import { FiMapPin } from 'react-icons/fi';

export default function NearbyProductsFilter({ onChange }) {
  // Fixed 3km radius, no toggle as it's mandatory
  const radius = 3;
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  
  // Function to open the location modal by clicking the trigger element
  const openLocationModal = () => {
    const trigger = document.querySelector('[data-location-trigger]');
    if (trigger) {
      trigger.click();
    } else {
      console.warn('Location trigger element not found');
    }
  };
  
  return (
    <SafeLocationConsumer>
      {({ userLocation, loading }) => {
        // Always apply the location filter when location is available
        useEffect(() => {
          if (userLocation) {
            // Notify parent component
            if (onChange) {
              onChange({
                enabled: true,
                radius,
                location: userLocation
              });
            }
          } else if (!loading) {
            // If not loading and no location, show prompt
            setShowLocationPrompt(true);
            
            // Notify parent that we don't have location yet
            if (onChange) {
              onChange({
                enabled: false,
                radius,
                location: null
              });
            }
          }
        }, [userLocation, onChange, loading]);
        
        // If no location is available
        if (!userLocation && !loading) {
          return (
            <div className="mb-4">
              <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                <div className="flex items-center text-yellow-700 mb-1">
                  <FiMapPin className="mr-2" />
                  <h3 className="text-sm font-medium">Location Required</h3>
                </div>
                <p className="text-xs text-yellow-600 mb-2">
                  We need your location to show you products within 3km of your area.
                </p>
                <button
                  onClick={openLocationModal}
                  className="text-xs bg-yellow-100 text-yellow-800 py-1 px-3 rounded hover:bg-yellow-200 transition-colors"
                >
                  Set Your Location
                </button>
              </div>
              
              {showLocationPrompt && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-sm text-blue-700 mb-2">
                    You must set your location to continue
                  </p>
                  <button
                    onClick={openLocationModal}
                    className="text-xs bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 transition-colors"
                  >
                    Set Location
                  </button>
                </div>
              )}
            </div>
          );
        }
        
        // If location is loading
        if (loading) {
          return (
            <div className="mb-4">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-md animate-pulse">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 rounded-full mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mt-2"></div>
              </div>
            </div>
          );
        }
        
        // If location is available, show active filter info
        return (
          <div className="mb-4">
            <div className="p-3 bg-green-50 border border-green-100 rounded-md">
              <div className="flex items-center text-green-700">
                <FiMapPin className="mr-2" />
                <h3 className="text-sm font-medium">Showing Nearby Products</h3>
              </div>
              <p className="text-xs text-green-600 mt-1">
                You are viewing products within 3km of your location.
              </p>
            </div>
          </div>
        );
      }}
    </SafeLocationConsumer>
  );
} 