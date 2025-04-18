"use client";

import { useState, useEffect } from 'react';
import { FiWifiOff, FiRefreshCw } from 'react-icons/fi';

const NetworkErrorAlert = ({ 
  message = "Failed to fetch data: Network Error", 
  onRetry,
  className = ""
}) => {
  const [visible, setVisible] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Set visible to true whenever message changes
    setVisible(true);
  }, [message]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={`bg-red-500 text-white p-4 rounded-md shadow-md flex items-center justify-between ${className}`}>
      <div className="flex items-center">
        <FiWifiOff className="mr-2 flex-shrink-0" />
        <span>{message}</span>
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <button
            onClick={handleRetry}
            className="bg-white text-red-500 rounded-md px-3 py-1 text-sm font-medium flex items-center"
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <FiRefreshCw className="mr-1 animate-spin" /> 
                Retrying...
              </>
            ) : (
              <>
                <FiRefreshCw className="mr-1" /> 
                Retry
              </>
            )}
          </button>
        )}
        <button
          onClick={() => setVisible(false)}
          className="ml-2 text-white hover:text-red-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default NetworkErrorAlert; 