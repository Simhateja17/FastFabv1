"use client";

import { useState, useEffect } from 'react';
import { SafeLocationConsumer } from './SafeLocationWrapper';
import { FiMapPin } from 'react-icons/fi';
import { useLocationStore } from '@/app/lib/locationStore';

// Renamed to NearbyProductsFilterContent to avoid recursive reference
const NearbyProductsFilterContent = ({ locationFilter, onLocationFilterChange }) => {
  const [isEnabled, setIsEnabled] = useState(locationFilter?.enabled || false);
  const [radius, setRadius] = useState(locationFilter?.radius || 3);
  const { userLocation } = useLocationStore();
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    // Update component state when props change
    setIsEnabled(locationFilter?.enabled || false);
    setRadius(locationFilter?.radius || 3);
  }, [locationFilter]);

  useEffect(() => {
    // Clear error message when location becomes available
    if (userLocation?.latitude && userLocation?.longitude) {
      setLocationError('');
    }
  }, [userLocation]);

  const toggleEnabled = async () => {
    if (!isEnabled) {
      // Trying to enable location filter
      if (!userLocation?.latitude || !userLocation?.longitude) {
        setLocationError('Please set your location first');
        return;
      }
      
      const newFilter = {
        enabled: true,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        radius,
      };
      
      setIsEnabled(true);
      onLocationFilterChange(newFilter);
      console.log('Enabled location filter:', newFilter);
    } else {
      // Disabling location filter
      const newFilter = {
        enabled: false,
        location: null,
        radius,
      };
      
      setIsEnabled(false);
      onLocationFilterChange(newFilter);
      console.log('Disabled location filter');
    }
  };

  const handleRadiusChange = (e) => {
    const newRadius = parseInt(e.target.value);
    setRadius(newRadius);
    
    if (isEnabled && userLocation?.latitude && userLocation?.longitude) {
      onLocationFilterChange({
        enabled: true,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        radius: newRadius,
      });
      console.log('Updated location radius to', newRadius, 'km');
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center">
        <FiMapPin className="mr-2" />
        Nearby Products
      </h3>
      
      {locationError && (
        <div className="mb-3 text-sm text-red-500">
          {locationError}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          Show products nearby
          {userLocation?.label && (
            <span className="block text-xs mt-1">
              Your location: {userLocation.label}
            </span>
          )}
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={isEnabled}
            onChange={toggleEnabled}
            className="sr-only peer" 
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>
      
      {userLocation?.latitude && userLocation?.longitude && (
        <div className="mt-4">
          <label className="block text-sm text-gray-500 mb-2">
            Search radius: {radius} km
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={radius}
            onChange={handleRadiusChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1km</span>
            <span>5km</span>
            <span>10km</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Export the wrapper that uses SafeLocationConsumer
export default function NearbyProductsFilter({ onChange }) {
  return (
    <SafeLocationConsumer>
      {({ userLocation, loading }) => (
        <NearbyProductsFilterContent 
          locationFilter={{ enabled: true, radius: 3 }} 
          onLocationFilterChange={onChange} 
        />
      )}
    </SafeLocationConsumer>
  );
} 