// public/sw.js - Service Worker for Web Push Notifications

console.log('Service Worker Loaded');

// --- Event Listeners ---

// Listen for incoming push messages
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  let data = {};
  try {
    data = event.data.json(); // Assuming payload is JSON
    console.log('[Service Worker] Push data:', data);
  } catch (e) {
    console.error('[Service Worker] Push event couldn\'t parse JSON data:', event.data.text());
    data = { title: 'New Notification', body: event.data.text() };
  }

  const title = data.title || 'Fast&Fab Notification';
  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/favicon.ico', // Default icon
    badge: '/logo-badge.png', // Optional: A smaller badge icon
    vibrate: [200, 100, 200], // Optional vibration pattern
    tag: data.tag || 'fastfab-notification', // Optional: groups notifications
    renotify: true, // Optional: Vibrate/sound even if tag matches
    data: data.data || {}, // Attach custom data (like URL, orderId)
    // --- Sound --- (Requires user interaction context, often better played from main page after receiving message via BroadcastChannel or client messaging)
    // Note: Directly playing sound here is unreliable across browsers/OS due to background restrictions.
    // A common pattern is to send a message from SW to the active page to play the sound.
    // We will attempt it, but have a fallback mechanism in mind.
    // silent: false // Explicitly try to play sound (though often ignored)
  };

  // --- Send message to client(s) to play sound --- 
  const messagePayload = { 
      type: 'PLAY_SOUND', 
      sound: '/alarm.mp3', // Path to the sound file 
      payload: data // Send original push data too if needed by client
  };
  const sendMsgToClients = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clients => {
    if (!clients || clients.length === 0) {
        console.log("[Service Worker] No clients found to send sound message to.");
        return;
    }
    console.log(`[Service Worker] Sending sound message to ${clients.length} client(s).`);
    clients.forEach(client => {
      client.postMessage(messagePayload);
    });
  });
  // ----------------------------------------------

  // Show notification & ensure sound message sending completes
  event.waitUntil(
    Promise.all([
        self.registration.showNotification(title, options),
        sendMsgToClients
    ])
  );

  // Optional: Send message to active client(s) if you want the page to react immediately
  // event.waitUntil(self.clients.matchAll({
  //   type: 'window',
  //   includeUncontrolled: true
  // }).then(clients => {
  //   if (!clients || clients.length === 0) return;
  //   clients.forEach(client => {
  //     client.postMessage({ type: 'NEW_ORDER_NOTIFICATION', data: data.data });
  //   });
  // }));
});

// Listen for notification click events
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');

  const notification = event.notification;
  const action = event.action; // If you add action buttons later

  notification.close(); // Close the notification

  // Example: Open the URL passed in the data payload
  if (notification.data && notification.data.url) {
    console.log('[Service Worker] Opening window:', notification.data.url);
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        // Check if the target URL is already open
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // If not open, open a new window
        if (clients.openWindow) {
          return clients.openWindow(notification.data.url);
        }
      })
    );
  } else {
      console.log('[Service Worker] No URL found in notification data to open.');
  }

  // Example: Handling specific actions if you added buttons
  // if (action === 'accept') {
  //   console.log('[Service Worker] Accept action clicked.');
  //   // TODO: Call API to accept order
  // } else if (action === 'reject') {
  //   console.log('[Service Worker] Reject action clicked.');
  //   // TODO: Call API to reject order
  // }
});

// Optional: Listen for install event - often used for pre-caching assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  // event.waitUntil(self.skipWaiting()); // Optional: Activate immediately
});

// Optional: Listen for activate event - often used for cleaning up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  // event.waitUntil(self.clients.claim()); // Optional: Take control of pages immediately
}); 