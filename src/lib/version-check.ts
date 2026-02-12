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
  // Only run in production — dev mode has a static "dev" version that would loop
  if (import.meta.env.DEV) return;

  // Guard against infinite reload: only attempt once per page load
  const key = 'version_check_ts';
  const last = sessionStorage.getItem(key);
  const now = Date.now();
  if (last && now - Number(last) < 10_000) return; // skip if checked <10s ago
  sessionStorage.setItem(key, String(now));

  try {
    const res = await fetch(`/version.json?t=${now}`, {
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
