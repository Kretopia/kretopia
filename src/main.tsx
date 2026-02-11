import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
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

// NOTE: VitePWA handles service worker registration automatically via registerType: "autoUpdate"
// Push notification support is included via the custom SW injection below

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>
);
