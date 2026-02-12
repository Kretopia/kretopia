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

  // Periodically check for SW updates (every 5 min)
  setInterval(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
      }
    } catch (e) {
      // Silently ignore — network may be offline
    }
  }, 5 * 60 * 1000);

  // Also check immediately on page visibility change (user returns to tab/app)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
        }
      } catch (e) {
        // Silently ignore
      }
    }
  });
}
