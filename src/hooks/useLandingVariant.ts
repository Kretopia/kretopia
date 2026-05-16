import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "landing_variant_v2";
const LEGACY_KEY = "landing_variant_v1";
const FORCE_PARAM = "lv"; // ?lv=a / ?lv=b to force

export type LandingVariant = "control" | "wedge";

/**
 * Guest landing selector.
 *
 * The OneWedge landing is now the canonical public landing. The older 50/50
 * A/B test left some visitors stuck on the previous control variant via
 * localStorage, so we explicitly retire that assignment and default to wedge.
 * Override with ?lv=control only for internal QA.
 */
export function useLandingVariant(): LandingVariant {
  const [variant, setVariant] = useState<LandingVariant>(() => {
    if (typeof window === "undefined") return "wedge";
    try {
      const url = new URL(window.location.href);
      const forced = url.searchParams.get(FORCE_PARAM);
      if (forced === "wedge" || forced === "control") {
        return forced;
      }
      localStorage.removeItem(LEGACY_KEY);
      localStorage.setItem(KEY, "wedge");
      return "wedge";
    } catch {
      return "wedge";
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
