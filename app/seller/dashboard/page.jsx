"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { toast } from "react-hot-toast";
import {
  FiPlusSquare,
  FiShoppingBag,
  FiDollarSign,
  FiRefreshCw,
  FiUser,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";

// The actual dashboard content
function DashboardContent() {
  const { seller, authFetch } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  
  const { 
    permissionStatus, 
    subscribeUser, 
    isSupported 
  } = usePushNotifications();

  const fetchVisibilityStatus = useCallback(async () => {
    try {
      // First, check if seller exists before proceeding
      if (!seller) {
        console.log('No seller data available in context, cannot fetch visibility status');
        setIsVisible(false); // Default to hidden if no seller data
        return;
      }

      // Debug log
      console.log('Fetching visibility status from API');
      
      const backendApiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000';
      const response = await authFetch(`${backendApiUrl}/api/seller/visibility`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Visibility status response:', data);
        
        if (data.isVisible !== undefined) {
          setIsVisible(data.isVisible);
        }
      } else {
        console.error('Failed to fetch visibility status:', response.status);
        // Fallback to the seller data we already have
        if (seller && seller.isVisible !== undefined) {
          setIsVisible(seller.isVisible);
        }
      }
    } catch (error) {
      console.error('Error fetching visibility status:', error);
      // Fallback to the seller data we already have
      if (seller && seller.isVisible !== undefined) {
        setIsVisible(seller.isVisible);
      } else {
        console.log('No seller context data after error, defaulting to visible');
        setIsVisible(true);
      }
    }
  }, [authFetch, seller]);
  
  useEffect(() => {
    if (seller) {
      // Initial visibility state from seller object
      if (seller.isVisible !== undefined) {
        setIsVisible(seller.isVisible);
      }
      
      // Also fetch the latest visibility status from the API
      fetchVisibilityStatus();
    }
  }, [seller, fetchVisibilityStatus]);

  useEffect(() => {
    if (!isSupported) return;

    const onboardingFlag = sessionStorage.getItem('onboardingComplete');
    
    if (onboardingFlag === 'true') {
      console.log('Onboarding complete flag found.');
      if (permissionStatus === 'default') {
        console.log('Notification permission is default, attempting to subscribe...');
        const timer = setTimeout(() => {
            subscribeUser();
        }, 1500);
        
        sessionStorage.removeItem('onboardingComplete');

        return () => clearTimeout(timer);
      } else {
        console.log(`Notification permission is already ${permissionStatus}. Clearing flag.`);
        sessionStorage.removeItem('onboardingComplete');
      }
    }
  }, [permissionStatus, subscribeUser, isSupported]);

  const handleVisibilityToggle = async () => {
    try {
      // Check if seller exists before proceeding
      if (!seller) {
        toast.error('Seller data is not available. Please refresh the page or contact support.');
        return;
      }

      // Check if within store hours before allowing toggle
      if (!isWithinStoreHours()) {
        toast.error('Cannot change store visibility outside of store hours');
        return;
      }

      setIsToggling(true);
      
      // Debug log
      console.log(`Toggling visibility from ${isVisible} to ${!isVisible}`);
      
      // Call the backend service API directly
      const backendApiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000';
      
      // Ensure the backend URL starts with http:// or https://
      const fullBackendUrl = backendApiUrl.startsWith('http') 
        ? backendApiUrl 
        : `https://${backendApiUrl}`;
      
      const apiUrl = `${fullBackendUrl}/api/seller/visibility`;
      console.log(`Using API URL: ${apiUrl}`);
      
      // Add retry mechanism
      let attempts = 0;
      const maxAttempts = 2;
      let success = false;
      let lastError = null;
      
      while (!success && attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`Attempt ${attempts} to toggle visibility`);
          
          const response = await authFetch(
            apiUrl,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                isVisible: !isVisible 
              }),
            }
          );

          // Log response status for debugging
          console.log(`Visibility toggle response status: ${response.status}`);

          if (response.ok) {
            const result = await response.json();
            console.log('Visibility toggle result:', result);
            
            setIsVisible(result.isVisible);
            
            // Use the *new* state (!isVisible) to determine the success message
            toast.success(
              !isVisible 
                ? 'Your store is now visible to customers' 
                : 'Your store is now hidden from customers'
            );
            
            success = true;
            break;
          } else {
            let errorMsg = 'Failed to update store visibility';
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || errorMsg;
            } catch (e) {
              // If JSON parsing fails, try to get text
              try {
                errorMsg = await response.text();
              } catch (textError) {
                console.error('Could not parse error response:', textError);
              }
            }
            
            console.error(`Visibility toggle error (attempt ${attempts}): ${errorMsg}`);
            lastError = new Error(errorMsg);
            
            // Wait before retrying
            if (attempts < maxAttempts) {
              console.log(`Waiting before retry ${attempts+1}...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          console.error(`Error in toggle attempt ${attempts}:`, error);
          lastError = error;
          
          // Wait before retrying
          if (attempts < maxAttempts) {
            console.log(`Waiting before retry ${attempts+1}...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!success && lastError) {
        throw lastError;
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error(error.message || 'Failed to update store visibility');
      
      // Refresh visibility status to ensure UI is in sync
      if (seller) { // Only fetch if seller exists
        fetchVisibilityStatus();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const dashboardItems = [
    {
      title: "Products",
      href: "/seller/products",
      icon: <FiPlusSquare className="w-6 h-6 text-black" />,
    },
    {
      title: "Your Orders",
      href: "/seller/orders",
      icon: <FiShoppingBag className="w-6 h-6 text-black" />,
    },
    {
      title: "Earnings",
      href: "/seller/earnings",
      icon: <FiDollarSign className="w-6 h-6 text-black" />,
    },
    {
      title: "Refunds",
      href: "/seller/refunds",
      icon: <FiRefreshCw className="w-6 h-6 text-black" />,
    },
    {
      title: "My Profile",
      href: "/seller/profile",
      icon: <FiUser className="w-6 h-6 text-black" />,
    },
  ];

  // Update the isWithinStoreHours function to be more robust
  const isWithinStoreHours = () => {
    // If seller data is missing or if store hours aren't set, default to true
    if (!seller || !seller.openTime || !seller.closeTime) {
      console.log('Store hours not set or seller data missing, defaulting to store open');
      return true;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openHours, openMinutes] = seller.openTime.split(':').map(Number);
    const [closeHours, closeMinutes] = seller.closeTime.split(':').map(Number);
    
    const openTime = openHours * 60 + openMinutes;
    const closeTime = closeHours * 60 + closeMinutes;
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    console.log(`Current time: ${currentTime}, Open time: ${openTime}, Close time: ${closeTime}, Is within hours: ${isOpen}`);
    return isOpen;
  };

  const storeStatus = isWithinStoreHours();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-primary mb-6">
        Seller Dashboard
      </h1>

      {seller && (
        <div className="bg-background-card p-4 rounded-lg shadow-sm mb-6 border border-ui-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h2 className="font-medium text-lg text-text-dark">
              Welcome, {seller.shopName || seller.phone}!
            </h2>
            
            <div className="mt-3 md:mt-0">
              <div className="flex items-center">
                <span className="mr-3 text-sm font-medium text-text-dark">
                  Store Visibility:
                </span>
                <button
                  disabled={isToggling || !storeStatus}
                  onClick={handleVisibilityToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                    isVisible ? 'bg-green-500' : 'bg-black'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                      isVisible ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'
                    }`}
                  />
                </button>
                <span className="ml-2 text-sm text-text-muted">
                  {isVisible ? (
                    <span className="flex items-center text-green-600">
                      <FiEye className="mr-1" /> Visible
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-500">
                      <FiEyeOff className="mr-1" /> Hidden
                    </span>
                  )}
                </span>
              </div>
              {!storeStatus && (
                 <p className="text-xs text-red-600 text-right mt-1">
                   Can only change when store is open
                 </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center mt-2">
            <div className={`h-3 w-3 rounded-full mr-2 ${storeStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="text-sm text-text-muted">
              {storeStatus 
                ? 'Your store is open right now' 
                : 'Your store is closed right now'}
              {seller.openTime && seller.closeTime && 
                ` (Hours: ${seller.openTime} - ${seller.closeTime})`}
            </p>
          </div>
          
          <p className="text-text-muted mt-2">
            Manage your products and orders from here.
          </p>
        </div>
      )}

      {!isSupported && 
          <p className="text-center text-sm text-red-600 my-2">Real-time order notifications are not supported on this browser.</p>
      }

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="p-6 bg-background-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-ui-border"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary bg-opacity-15 rounded-full text-primary">
                {item.icon}
              </div>
              <h2 className="text-xl font-medium text-text-dark">
                {item.title}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Wrap the dashboard content with the ProtectedRoute component
export default function SellerDashboard() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
