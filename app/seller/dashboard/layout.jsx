"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { DashboardHeader } from "./DashboardHeader";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";
import { FiBell, FiBellOff } from 'react-icons/fi';
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

  const handleSubscribeClick = () => {
    if (!isLoading) {
      subscribeUser();
    }
  };

  const handleUnsubscribeClick = () => {
     if (!isLoading) {
      unsubscribeUser();
    }
  };

  if (!isSupported) {
    return <p className="text-xs text-red-600">Push notifications not supported on this browser.</p>;
  }

  if (isLoading) {
     return <p className="text-xs text-gray-500">Loading notification status...</p>;
  }

  if (permissionStatus === 'denied') {
    return <p className="text-xs text-orange-600">Notifications blocked. Please enable in browser settings.</p>;
  }

  if (isSubscribed) {
    return (
      <button 
        onClick={handleUnsubscribeClick}
        disabled={isLoading}
        className="flex items-center px-3 py-1 border border-red-300 text-red-600 rounded-md text-xs hover:bg-red-50 disabled:opacity-50"
        title="Disable order notifications on this device"
      >
        <FiBellOff className="mr-1" /> Disable Notifications
      </button>
    );
  }

  // If permission is default or granted but not subscribed (e.g., previous attempt failed)
  return (
    <button 
      onClick={handleSubscribeClick}
      disabled={isLoading}
      className="flex items-center px-3 py-1 bg-primary text-white rounded-md text-xs hover:bg-primary-dark disabled:opacity-50"
      title="Enable real-time order notifications on this device"
    >
      <FiBell className="mr-1" /> Enable Order Notifications
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
