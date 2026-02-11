// Push Notification handlers for the VitePWA service worker
// These events are handled by the browser's push API
// The main service worker is managed by VitePWA (workbox)

self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ThriveIN', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
