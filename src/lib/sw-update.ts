/**
 * Service Worker update detection & forced reload.
 * 
 * Listens for VitePWA's "controlling" event — when a new SW takes over,
 * it reloads the page so users always get the latest code.
 * Also periodically checks for updates every 5 minutes.
 */

export function initSWUpdateListener() {
  if (!('serviceWorker' in navigator)) return;

  // When a new SW takes control, reload to get fresh assets
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[SW Update] New service worker active — reloading for latest version');
    window.location.reload();
  });

  // Force-skip waiting on any new SW immediately
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      window.location.reload();
    }
  });

  // Check for updates IMMEDIATELY on load
  checkForUpdate();

  // Periodically check for SW updates (every 2 min)
  setInterval(checkForUpdate, 2 * 60 * 1000);

  // Also check on page visibility change (user returns to tab/app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate();
    }
  });
}

async function checkForUpdate() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update();
      // If there's a waiting SW, force it to activate
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Listen for future waiting SWs
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed while old one still controls — force skip
              newSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    }
  } catch (e) {
    // Silently ignore — network may be offline
  }
}
