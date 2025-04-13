import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast'; // Assuming react-hot-toast is used
import { useAuth } from '@/app/context/AuthContext'; // Import useAuth hook

// VAPID public key from environment variables (must be prefixed with NEXT_PUBLIC_)
// Add fallback mechanism: if env var isn't loaded, use a window variable that can be set in _document.js
const getVapidKey = () => {
  // Try env variable first
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    console.log('Using VAPID key from environment variable');
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }
  
  // Fall back to window object (set in layout.js)
  if (typeof window !== 'undefined' && window.__NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    console.log('Using VAPID key from window object');
    return window.__NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }
  
  // Hard-coded fallback as last resort - ONLY use in production emergencies!
  // This should be replaced with proper env var configuration ASAP
  console.error('VAPID Public Key missing from both env vars and window object');
  return 'BIyWo8CpIQqzU_EZlkUv9A5LfxlaEYFPIKSJKhc6fN5Lfh3rwzwFsuslAnLrcxsZUjy9_y0911ApvKOVXC8H_JU';
};

const VAPID_PUBLIC_KEY = getVapidKey();

// Log the key availability for debugging
if (typeof window !== 'undefined') {
  console.log('VAPID Key Available:', !!VAPID_PUBLIC_KEY);
  console.log('VAPID Key Length:', (VAPID_PUBLIC_KEY || '').length);
  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID Public Key is missing. Check env vars or window.__NEXT_PUBLIC_VAPID_PUBLIC_KEY');
  }
}

/**
 * Custom hook to manage web push notification logic.
 *
 * Returns:
 * - permissionStatus: 'default', 'granted', or 'denied'
 * - isSubscribed: boolean indicating if the browser is currently subscribed
 * - subscribeUser: function to trigger the subscription process
 * - unsubscribeUser: function to trigger unsubscription
 * - isSupported: boolean indicating if Push API is supported
 * - isLoading: boolean indicating if an operation is in progress
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start loading until checked
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const { authFetch } = useAuth(); // Get authFetch from context

  // Check for support and register SW on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermissionStatus(Notification.permission);

      navigator.serviceWorker.register('/sw.js')
        .then(swReg => {
          console.log('Service Worker registered.', swReg);
          setRegistration(swReg);
          return swReg.pushManager.getSubscription();
        })
        .then(sub => {
          if (sub) {
            console.log('User IS already subscribed.');
            setCurrentSubscription(sub);
            setIsSubscribed(true);
          } else {
            console.log('User is NOT subscribed.');
            setIsSubscribed(false);
          }
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
          toast.error('Notification service failed to load.');
          setIsLoading(false);
        });
    } else {
      console.warn('Web Push Notifications or Service Workers not supported.');
      setIsSupported(false);
      setIsLoading(false);
    }
  }, []);

  // Listen for messages from SW to play sound
  useEffect(() => {
    if (!isSupported) return;

    const messageListener = (event) => {
      console.log('[App] Message received from SW:', event.data);
      if (event.data?.type === 'PLAY_SOUND' && event.data?.sound) {
        console.log(`[App] Playing sound: ${event.data.sound}`);
        try {
          // Important: Ensure the sound file exists at this path in /public
          const audio = new Audio(event.data.sound);
          audio.play().catch(e => console.error('[App] Error playing sound:', e));
        } catch (e) {
          console.error('[App] Could not create/play Audio object:', e);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', messageListener);
    return () => navigator.serviceWorker.removeEventListener('message', messageListener);
  }, [isSupported]);

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe function
  const subscribeUser = useCallback(async () => {
    if (!isSupported || !registration) {
      toast.error('Notification service not available.');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID Public Key is missing. Check env vars.');
      toast.error('Notification configuration error.');
      return;
    }
    if (isSubscribed) {
        toast.success('Already subscribed to notifications.');
        return;
    }

    setIsLoading(true);

    // Request permission
    try {
      const currentPermission = await Notification.requestPermission();
      setPermissionStatus(currentPermission);
      if (currentPermission !== 'granted') {
        toast.error('Notification permission denied.');
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission.');
      setIsLoading(false);
      return;
    }

    // Subscribe
    try {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log('Using VAPID key length:', VAPID_PUBLIC_KEY.length);
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('New subscription obtained:', sub);
      
      // Send to backend using authFetch
      try {
        if (!authFetch) {
            console.error('Authentication context not available');
            throw new Error('Authentication context not available. Cannot save subscription.');
        }
        
        console.log("Sending subscription to backend via authFetch...");
        
        // Verify we have valid auth
        const checkResponse = await authFetch('/api/auth/profile', {
          method: 'GET'
        });
        
        if (!checkResponse.ok) {
          console.error('Auth check failed before subscription:', checkResponse.status);
          throw new Error('Authentication validation failed. Please refresh and try again.');
        }
        console.log('Auth validated successfully');
        
        // Use authFetch which should automatically handle headers
        const response = await authFetch('/api/seller/subscriptions', {
          method: 'POST',
          body: JSON.stringify(sub),
          // No need to manually set Content-Type or Authorization if authFetch handles it
        });

        // Check if the response itself indicates failure (authFetch might return a Response object)
        if (!response.ok) { 
          let errorMsg = `Server error ${response.status}`;
          try { // Try to parse error from backend
              const errorData = await response.json();
              errorMsg = errorData.error || errorMsg;
          } catch (e) { /* Ignore parsing error */ }
          throw new Error(errorMsg);
        }

        // Assuming successful response has JSON body
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Backend failed to save subscription.');
        }

        console.log('Subscription saved on server.');
        setCurrentSubscription(sub);
        setIsSubscribed(true);
        toast.success('Subscribed to notifications!');

      } catch (serverError) {
        console.error('Failed to send/save subscription:', serverError);
        toast.error(`Subscription failed: ${serverError.message}`);
        // Try to clean up the local subscription since it couldn't be saved server-side
        try {
          await sub.unsubscribe();
          console.log('Cleaned up local subscription after server error');
        } catch (e) {
          console.error('Failed to cleanup local subscription after server error', e);
        }
        setIsSubscribed(false);
        setCurrentSubscription(null);
      }

    } catch (subError) {
      console.error('Failed to subscribe:', subError);
      toast.error(`Subscription failed: ${subError.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [registration, isSupported, isSubscribed, authFetch]);

  // Unsubscribe function
  const unsubscribeUser = useCallback(async () => {
    if (!currentSubscription) {
      toast.error('Not currently subscribed.');
      return;
    }
    setIsLoading(true);
    try {
      await currentSubscription.unsubscribe();
      console.log('User unsubscribed locally.');
      setCurrentSubscription(null);
      setIsSubscribed(false);
      toast.success('Unsubscribed successfully.');
      // TODO: Send request to backend API to delete this subscription using authFetch
      // Example:
      // try {
      //   await authFetch('/api/seller/subscriptions', {
      //     method: 'DELETE',
      //     body: JSON.stringify({ endpoint: currentSubscription.endpoint })
      //   });
      // } catch (deleteError) {
      //    console.error('Failed to delete subscription on server:', deleteError);
      // }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Unsubscription failed.');
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, authFetch]);

  return { permissionStatus, isSubscribed, subscribeUser, unsubscribeUser, isSupported, isLoading };
} 