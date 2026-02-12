/**
 * Build-version cache busting.
 *
 * Every build embeds a unique BUILD_VERSION via Vite's define config.
 * On app load we fetch /version.json (cache-busted) from the server.
 * If the server version differs from the embedded one, we nuke every
 * SW cache + unregister the service worker and hard-reload so the user
 * always sees the latest deploy.
 *
 * IMPORTANT: Only runs in production builds. In dev mode the version.json
 * contains "dev" which would never match the build hash, causing an
 * infinite reload loop.
 */

const EMBEDDED_VERSION = __BUILD_VERSION__;

export async function checkForNewVersion() {
  // In dev the embedded version is "dev" and version.json also says "dev" — no-op
  if (EMBEDDED_VERSION === 'dev') return;

  // Guard against infinite reload: only attempt once per 30s window
  const key = 'version_check_ts';
  const last = sessionStorage.getItem(key);
  const now = Date.now();
  if (last && now - Number(last) < 30_000) return;
  sessionStorage.setItem(key, String(now));

  try {
    // Bypass ALL caches — service worker, disk cache, CDN
    const res = await fetch(`/version.json?_=${now}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) return;

    const { version } = await res.json();

    if (version && version !== 'dev' && version !== EMBEDDED_VERSION) {
      console.log(
        `[Version Check] Stale build detected (have: ${EMBEDDED_VERSION}, server: ${version}). Purging caches…`
      );
      await purgeAllCaches();
      // Use replace so back-button doesn't loop
      window.location.replace(window.location.href);
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
