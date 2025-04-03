"use client";

import { FiMapPin, FiAlertCircle } from "react-icons/fi";

export default function LocationRequiredMessage() {
  // Call this when user clicks the location modal trigger
  const handleOpenLocationModal = () => {
    // Find and click the location selector button in the navbar
    document.querySelector('[data-location-trigger]')?.click();
  };

  return (
    <div className="w-full py-12 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-8 text-center">
        <FiMapPin className="w-16 h-16 mx-auto text-primary mb-4" />
        
        <h2 className="text-2xl font-bold mb-4">Location Required</h2>
        
        <p className="mb-6 text-gray-600">
          We need your location to show you products available in your area.
          Please set your location to continue.
        </p>
        
        <div className="flex flex-col space-y-4">
          <button
            onClick={handleOpenLocationModal}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Set Your Location
          </button>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-left">
            <div className="flex items-start">
              <FiAlertCircle className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Fast & Fab works best when we know your location. This helps us show you products that are available near you for faster delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 