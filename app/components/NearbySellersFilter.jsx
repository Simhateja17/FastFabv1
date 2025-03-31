"use client";

import { useState, useEffect } from 'react';
import { SafeLocationConsumer } from './SafeLocationWrapper';
import { FiMapPin, FiAlertCircle } from 'react-icons/fi';

export default function NearbySellersFilter({ onFilterChange }) {
  const [radius] = useState(3); // Fixed 3km radius (no longer editable)
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Render location modal prompt if needed
  const renderLocationPrompt = () => {
    if (!showLocationModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
          <button 
            onClick={() => setShowLocationModal(false)}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          >
            <FiAlertCircle className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-semibold mb-4">Location Needed</h2>
          
          <p className="mb-4">
            To show you nearby products within 3km, we need your location information.
            Please set your location to continue.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowLocationModal(false);
                document.querySelector('[data-location-trigger]')?.click();
              }}
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              Set Location
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the component with location context safely provided
  return (
    <SafeLocationConsumer>
      {({ userLocation, loading: locationLoading }) => {
        // Always apply the location filter when location is available
        useEffect(() => {
          if (userLocation) {
            // Apply location filter
            if (onFilterChange) {
              onFilterChange({
                enabled: true,
                location: userLocation,
                radius,
              });
            }
          } else if (!locationLoading) {
            // If not loading and no location, prompt user to set location
            setShowLocationModal(true);
          }
        }, [userLocation, onFilterChange, radius, locationLoading]);
        
        // If no location is available, show a simple info message
        if (!userLocation && !locationLoading) {
          return (
            <div className="mb-6">
              {renderLocationPrompt()}
              <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                <div className="flex items-center text-yellow-700">
                  <FiMapPin className="mr-2" />
                  <p className="text-sm font-medium">Location required</p>
                </div>
                <p className="text-xs mt-1 text-yellow-600">
                  We need your location to show you products within 3km of your area.
                </p>
                <button
                  onClick={() => document.querySelector('[data-location-trigger]')?.click()}
                  className="mt-2 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                >
                  Set Your Location
                </button>
              </div>
            </div>
          );
        }

        // If location is loading, show loading state
        if (locationLoading) {
          return (
            <div className="mb-6">
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

        // If location is available, show the active filter info
        return (
          <div className="mb-6">
            <div className="p-3 bg-green-50 border border-green-100 rounded-md">
              <div className="flex items-center text-green-700">
                <FiMapPin className="mr-2" />
                <p className="text-sm font-medium">Showing nearby products</p>
              </div>
              <p className="text-xs mt-1 text-green-600">
                You are viewing products within 3km of your location.
              </p>
            </div>
          </div>
        );
      }}
    </SafeLocationConsumer>
  );
} 