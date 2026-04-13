import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import { initSWUpdateListener } from "./lib/sw-update";
import { checkForNewVersion } from "./lib/version-check";
import "./i18n";
import "./index.css";

// Initialize Sentry for error monitoring
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // Only enable in production
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// VitePWA handles SW registration via registerType: "autoUpdate"
// Our listener detects when a new SW activates and force-reloads for freshness
initSWUpdateListener();

// Nuclear cache-bust: compare embedded build hash vs server version.json
// If stale, purge ALL caches + unregister SW + hard reload
checkForNewVersion();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>
);
