import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight, privacy-respecting platform analytics.
 * Writes to public.site_analytics with scope='platform'.
 *
 * - Visitor ID: persistent across sessions (localStorage)
 * - Session ID: 30-min inactivity window (sessionStorage + timestamp)
 * - Bounce: a session with exactly 1 pageview AND duration < 10s
 * - Time on page: measured on visibilitychange/pagehide and route change
 */

const VISITOR_KEY = "_ti_vid";
const SESSION_KEY = "_ti_sid";
const SESSION_TS_KEY = "_ti_sid_ts";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

const getDeviceType = (): string => {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
};

const getVisitorId = (): string => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

const getSessionId = (): string => {
  try {
    const now = Date.now();
    const lastTs = Number(sessionStorage.getItem(SESSION_TS_KEY) || 0);
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid || now - lastTs > SESSION_TIMEOUT_MS) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return sid;
  } catch {
    return crypto.randomUUID();
  }
};

// Internal: track current page for duration measurement
let currentPath: string | null = null;
let pageStartTs: number = 0;
let durationFlushed = false;

const flushPageDuration = async () => {
  if (!currentPath || durationFlushed) return;
  durationFlushed = true;
  const duration = Date.now() - pageStartTs;
  const sessionId = getSessionId();
  try {
    await supabase.from("site_analytics").insert({
      scope: "platform",
      event_type: "duration",
      visitor_id: getVisitorId(),
      session_id: sessionId,
      page_path: currentPath,
      duration_ms: duration,
      device_type: getDeviceType(),
    });
  } catch {
    // silent
  }
};

export const trackPlatformPageview = async (path: string) => {
  // Flush previous page's duration before starting a new one
  if (currentPath && currentPath !== path) {
    await flushPageDuration();
  }

  currentPath = path;
  pageStartTs = Date.now();
  durationFlushed = false;

  const sessionId = getSessionId();
  try {
    await supabase.from("site_analytics").insert({
      scope: "platform",
      event_type: "view",
      visitor_id: getVisitorId(),
      session_id: sessionId,
      page_path: path,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
    });
  } catch {
    // silent
  }
};

let listenersAttached = false;

export const attachPlatformAnalyticsListeners = () => {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  // Flush on tab hide / page unload
  const onHide = () => {
    if (document.visibilityState === "hidden") {
      void flushPageDuration();
    }
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", () => void flushPageDuration());
};
