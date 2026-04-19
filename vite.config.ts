import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { versionPlugin } from "./plugins/version-plugin";
import { magazineSharePagesPlugin } from "./plugins/magazine-share-pages";
import { profileSharePagesPlugin } from "./plugins/profile-share-pages";
import { gigSharePagesPlugin } from "./plugins/gig-share-pages";
import { eventSharePagesPlugin } from "./plugins/event-share-pages";
import { campaignSharePagesPlugin } from "./plugins/campaign-share-pages";

const { hash: buildHash, plugin: versionJsonPlugin } = versionPlugin();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      __BUILD_VERSION__: JSON.stringify(buildHash),
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: false,
        },
        includeAssets: ["favicon.png", "apple-touch-icon.png"],
        // Inject push notification handlers from public/sw.js
        injectManifest: undefined,
        workbox: {
          // Force immediate update - critical for PWA freshness
          skipWaiting: true,
          clientsClaim: true,
          // Clean old caches on update
          cleanupOutdatedCaches: true,
          // CRITICAL: Never precache version.json — it must always be fetched fresh
          globIgnores: ['**/version.json'],
          // CRITICAL: Don't cache OAuth redirect route
          navigateFallbackDenylist: [/^\/~oauth/],
          // Import push notification scripts
          importScripts: ['/sw.js'],
          // Cache strategy
          runtimeCaching: [
            {
              // API calls: always network first
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5,
                },
              },
            },
            {
              // Static assets: cache but revalidate quickly
              urlPattern: /\.(png|jpg|jpeg|svg|gif|woff|woff2)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            // NOTE: JS/CSS are NOT cached via runtimeCaching — 
            // Vite uses content-hashed filenames so workbox precaching handles them.
            // This prevents stale JS bundles from being served after deploys.
          ],
        },
        manifest: {
          name: "ThriveIN - Creative Collaboration",
          short_name: "ThriveIN",
          description: "Swipe to find your next creative collaborator",
          theme_color: "#7c3aed",
          background_color: "#0a0a0a",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
      versionJsonPlugin,
      magazineSharePagesPlugin({
        projectUrl: env.VITE_SUPABASE_URL,
        publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        siteUrl: "https://www.thrivein.io",
      }),
      profileSharePagesPlugin({
        projectUrl: env.VITE_SUPABASE_URL,
        publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        siteUrl: "https://www.thrivein.io",
      }),
      gigSharePagesPlugin({
        projectUrl: env.VITE_SUPABASE_URL,
        publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        siteUrl: "https://www.thrivein.io",
      }),
      eventSharePagesPlugin({
        projectUrl: env.VITE_SUPABASE_URL,
        publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        siteUrl: "https://www.thrivein.io",
      }),
      campaignSharePagesPlugin({
        projectUrl: env.VITE_SUPABASE_URL,
        publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        siteUrl: "https://www.thrivein.io",
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Deduplicate React to prevent multiple instances
        react: path.resolve(__dirname, "./node_modules/react"),
        "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
  };
});
