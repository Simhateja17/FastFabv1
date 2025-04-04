"use client";

import { useState, useEffect } from "react";
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

// The actual dashboard content
function DashboardContent() {
  const { seller, authFetch } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  
  // Declare the fetchVisibilityStatus function at component level
  const fetchVisibilityStatus = async () => {
    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000/api';
      const apiUrl = `${backendApiUrl}/seller/visibility`; // Correct backend endpoint
      console.log(`Fetching visibility status from: ${apiUrl}`);
      
      const response = await authFetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched visibility status:', data);
        if (data && data.data && data.data.isVisible !== undefined) {
          setIsVisible(data.data.isVisible);
        }
      } else if (response.status === 404) {
        // If endpoint is not found, it might be because we haven't migrated the database yet
        console.log('Visibility endpoint not found (404), using fallback');
        // Assume store is visible by default
        setIsVisible(true);
        
        // Fallback to seller data from context if available
        if (seller && seller.isVisible !== undefined) {
          console.log('Using fallback visibility from seller context');
          setIsVisible(seller.isVisible);
        }
      } else {
        console.error('Failed to fetch visibility status:', response.status);
        // Fallback to seller data from context if API fails
        if (seller && seller.isVisible !== undefined) {
          console.log('Using fallback visibility from seller context');
          setIsVisible(seller.isVisible);
        } else {
          // If no seller data either, assume store is visible
          console.log('No seller context data, defaulting to visible');
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error fetching visibility status:', error);
      // Fallback to seller data from context
      if (seller && seller.isVisible !== undefined) {
        console.log('Using fallback visibility from seller context after error');
        setIsVisible(seller.isVisible);
      } else {
        // If no seller data either, assume store is visible
        console.log('No seller context data after error, defaulting to visible');
        setIsVisible(true);
      }
    }
  };
  
  useEffect(() => {
    if (seller) {
      // Initial visibility state from seller object
      if (seller.isVisible !== undefined) {
        setIsVisible(seller.isVisible);
      }
      
      // Also fetch the latest visibility status from the API
      fetchVisibilityStatus();
    }
  }, [seller, authFetch]);

  const handleVisibilityToggle = async () => {
    try {
      setIsToggling(true);
      
      // Debug log
      console.log(`Toggling visibility from ${isVisible} to ${!isVisible}`);
      
      // Call the backend service API directly
      const backendApiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000/api'; // Define backend URL
      const apiUrl = `${backendApiUrl}/seller/visibility`; // Correct backend endpoint
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
      fetchVisibilityStatus();
    } finally {
      setIsToggling(false);
    }
  };

  const dashboardItems = [
    {
      title: "Products",
      href: "/seller/products",
      icon: <FiPlusSquare className="w-6 h-6 text-white" />,
    },
    {
      title: "Your Orders",
      href: "/seller/orders",
      icon: <FiShoppingBag className="w-6 h-6 text-white" />,
    },
    {
      title: "Earnings",
      href: "/seller/earnings",
      icon: <FiDollarSign className="w-6 h-6 text-white" />,
    },
    {
      title: "Refunds",
      href: "/seller/refunds",
      icon: <FiRefreshCw className="w-6 h-6 text-white" />,
    },
    {
      title: "My Profile",
      href: "/seller/profile",
      icon: <FiUser className="w-6 h-6 text-white" />,
    },
  ];

  // Check if current time is within store hours
  const isWithinStoreHours = () => {
    if (!seller || !seller.openTime || !seller.closeTime) return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openHours, openMinutes] = seller.openTime.split(':').map(Number);
    const [closeHours, closeMinutes] = seller.closeTime.split(':').map(Number);
    
    const openTime = openHours * 60 + openMinutes;
    const closeTime = closeHours * 60 + closeMinutes;
    
    return currentTime >= openTime && currentTime <= closeTime;
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
                  disabled={isToggling}
                  onClick={handleVisibilityToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    isVisible ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isVisible ? 'translate-x-6' : 'translate-x-1'
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
