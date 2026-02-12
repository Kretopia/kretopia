// SW Version - update to force cache invalidation
const SW_VERSION = "2.0.0-20260212";
console.log(`[SW ${SW_VERSION}] Service worker loaded`);

// Force immediate activation on update
self.addEventListener('install', function(event) {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log(`[SW ${SW_VERSION}] Clearing cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Push Notification handlers
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
