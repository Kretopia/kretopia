/**
 * Build-version cache busting.
 *
 * Every build embeds a unique BUILD_VERSION via Vite's define config.
 * On app load we fetch /version.json (cache-busted) from the server.
 * If the server version differs from the embedded one, we nuke every
 * SW cache + unregister the service worker and hard-reload so the user
 * always sees the latest deploy.
 */

const EMBEDDED_VERSION = __BUILD_VERSION__;

export async function checkForNewVersion() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return;

    const { version } = await res.json();

    if (version && version !== EMBEDDED_VERSION) {
      console.log(
        `[Version Check] Stale build detected (have: ${EMBEDDED_VERSION}, server: ${version}). Purging caches…`
      );
      await purgeAllCaches();
      window.location.reload();
    }
  } catch {
    // Offline or first deploy without version.json — ignore
  }
}

async function purgeAllCaches() {
  // 1. Delete every Cache Storage entry (Workbox precache, runtime, etc.)
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // 2. Unregister all service workers so the next load fetches fresh SW
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
}

// TypeScript: declare the global injected by Vite define
declare const __BUILD_VERSION__: string;
