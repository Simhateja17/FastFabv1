"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { DashboardHeader } from "./DashboardHeader";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";
import { FiBell, FiBellOff, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// Metadata is moved to a separate file or handled differently
// since it can't be exported from a client component

// Component to handle notification button/status
function NotificationControl() {
  const { 
    permissionStatus, 
    isSubscribed, 
    subscribeUser,
    unsubscribeUser, 
    isSupported, 
    isLoading 
  } = usePushNotifications();

  const handleUnsubscribeClick = () => {
     if (!isLoading) {
      unsubscribeUser();
    }
  };

  if (!isSupported) {
    return null;
  }

  if (isLoading) {
     return (
        <div className="flex items-center px-3 py-1 text-gray-500 text-xs">
             <FiLoader className="animate-spin mr-1" /> Checking Status...
        </div>
     );
  }

  if (permissionStatus === 'denied') {
    return <p className="text-xs text-orange-600">Notifications blocked in browser settings.</p>;
  }

  if (isSubscribed) {
    return (
      <button 
        onClick={handleUnsubscribeClick}
        disabled={isLoading}
        className="flex items-center px-3 py-1 border border-red-300 text-red-600 rounded-md text-xs hover:bg-red-50 disabled:opacity-50"
        title="Disable order notifications on this device"
      >
        <FiBellOff className="mr-1" /> Notifications Enabled (Disable)
      </button>
    );
  }

  // Default/Prompt state: Offer to enable notifications
  return (
    <button 
      onClick={subscribeUser}
      disabled={isLoading}
      className="flex items-center px-3 py-1 bg-black text-white rounded-md text-xs hover:bg-gray-800 disabled:opacity-50"
      title="Enable order notifications on this device"
    >
      <FiBell className="mr-1" /> Enable Notifications
    </button>
  );
}

export default function SellerDashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#faf9f8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardHeader />
          <div className="my-4 flex justify-end">
             <NotificationControl />
          </div>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </div>
    </ProtectedRoute>
  );
}
