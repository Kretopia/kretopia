import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "landing_variant_v1";
const FORCE_PARAM = "lv"; // ?lv=a / ?lv=b to force

export type LandingVariant = "control" | "wedge";

/**
 * Sticky 50/50 A/B assignment for the guest landing.
 * - control = current 8-section narrative (Hero + Reel + …)
 * - wedge   = One-wedge "Verified Credits + Scout" page (Caribbean-aware)
 *
 * Assignment is persisted in localStorage so the same visitor always sees
 * the same variant. Override with ?lv=control or ?lv=wedge for QA.
 */
export function useLandingVariant(): LandingVariant {
  const [variant, setVariant] = useState<LandingVariant>(() => {
    if (typeof window === "undefined") return "control";
    try {
      const url = new URL(window.location.href);
      const forced = url.searchParams.get(FORCE_PARAM);
      if (forced === "wedge" || forced === "control") {
        localStorage.setItem(KEY, forced);
        return forced;
      }
      const stored = localStorage.getItem(KEY) as LandingVariant | null;
      if (stored === "wedge" || stored === "control") return stored;
      const assigned: LandingVariant = Math.random() < 0.5 ? "wedge" : "control";
      localStorage.setItem(KEY, assigned);
      return assigned;
    } catch {
      return "control";
    }
  });

  // Fire one exposure event per session so we can compute conversion per arm
  useEffect(() => {
    try {
      const sessionKey = `landing_variant_exposed_${variant}`;
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");
      supabase
        .from("site_analytics")
        .insert({
          visitor_id: localStorage.getItem("_ti_vid") || crypto.randomUUID(),
          page_path: window.location.pathname,
          event_type: "view",
          event_target: `landing_variant:${variant}`,
          referrer: document.referrer || null,
          device_type:
            window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        })
        .then(() => {}, () => {});
    } catch {
      // silent
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return variant;
}

export function trackLandingCta(variant: LandingVariant, target: string) {
  try {
    supabase
      .from("site_analytics")
      .insert({
        visitor_id: localStorage.getItem("_ti_vid") || crypto.randomUUID(),
        page_path: window.location.pathname,
        event_type: "click",
        event_target: `landing_variant:${variant}:${target}`,
        device_type:
          window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      })
      .then(() => {}, () => {});
  } catch {
    // silent
  }
}
