"use client";

import { useState, useEffect } from 'react';
import { SafeLocationConsumer } from './SafeLocationWrapper';
import { FiMapPin, FiAlertCircle } from 'react-icons/fi';

// New component to hold hook logic
function NearbySellersFilterContent({ userLocation, locationLoading, onFilterChange }) {
  const radius = 3; // Fixed 3km radius
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Moved useEffect here
  useEffect(() => {
    if (userLocation) {
      setShowLocationModal(false);
      if (onFilterChange) {
        onFilterChange({
          enabled: true,
          location: userLocation,
          radius,
        });
      }
    } else if (!locationLoading) {
      setShowLocationModal(true);
      if (onFilterChange) {
        onFilterChange({ enabled: false, location: null, radius });
      }
    }
  }, [userLocation, onFilterChange, radius, locationLoading]);

  // Moved location prompt logic here
  const renderLocationPrompt = () => {
    if (!showLocationModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto">
          <h3 className="text-lg font-medium mb-4">Location Needed</h3>
          <p className="text-sm text-gray-600 mb-4">
            To find sellers near you, please allow location access or set your location manually.
          </p>
          <div className="flex justify-end space-x-2">
            <button 
              onClick={() => setShowLocationModal(false)} 
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Maybe Later
            </button>
            <button 
              onClick={() => document.querySelector('[data-location-trigger]')?.click()} 
              className="px-4 py-2 text-sm text-white bg-primary rounded hover:bg-primary-dark"
            >
              Set Location
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Moved conditional rendering logic here
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

  return (
    <div className="mb-6">
      {renderLocationPrompt()} {/* Render prompt if needed, now handled by state */}
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
}

// Original component now just renders the consumer and the content component
export default function NearbySellersFilter({ onFilterChange }) {
  return (
    <SafeLocationConsumer>
      {({ userLocation, loading: locationLoading }) => (
        <NearbySellersFilterContent
          userLocation={userLocation}
          locationLoading={locationLoading}
          onFilterChange={onFilterChange}
        />
      )}
    </SafeLocationConsumer>
  );
} 