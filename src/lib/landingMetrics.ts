/**
 * landingMetrics — Landing page instrumentation. A thin, purpose-built
 * vocabulary layer over the existing trackEvent()/analytics_events pipeline
 * from analytics.ts -- same writer, same table, same session-id and
 * fail-safe behavior. Not a second analytics system (see the audit's note
 * on useLandingVariant's separate site_analytics table -- this deliberately
 * does not repeat that duplication).
 *
 * Every tracker here fails silently (trackEvent already swallows errors)
 * and never blocks navigation or signup -- callers fire-and-forget.
 */
import { useEffect, useRef } from "react";
import { trackEvent } from "./analytics";

const EVENT_CATEGORY = "landing";

/**
 * Every section actually rendered on the real Landing page
 * (LandingBelowFold.tsx), used as-is for section/entry-source tracking --
 * not the illustrative hero/proof/pricing/faq categories the spec's own
 * JSON examples show, which this page has no equivalent of. Kept in sync
 * with LandingBelowFold.tsx by hand; add here when a section is added there.
 */
export type LandingSectionId =
  | "hero"
  | "search_tutorial"
  | "chapter-passport"
  | "verified_credits"
  | "trust"
  | "product_loop"
  | "chapter-scout"
  | "chapter-match"
  | "chapter-studio"
  | "meet_kreto"
  | "creative_universe"
  | "chapter-community"
  | "for_organisations"
  | "closing_cta";

// ---- Section views --------------------------------------------------------
// Once per section per page view. Module-scoped Set, not persisted -- a hard
// reload naturally resets it; within one SPA session a section already
// counted won't double-fire.
const viewedSections = new Set<string>();

export function trackLandingSectionViewed(section: LandingSectionId, variant: string = "control") {
  if (viewedSections.has(section)) return;
  viewedSections.add(section);
  trackEvent({
    eventName: "landing_section_viewed",
    eventCategory: EVENT_CATEGORY,
    properties: { section, variant },
  });
}

/** Attach the returned ref to a section's root element. Fires once, then stops observing. */
export function useLandingSectionView<T extends HTMLElement = HTMLElement>(section: LandingSectionId, variant: string = "control") {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || viewedSections.has(section)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trackLandingSectionViewed(section, variant);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [section, variant]);
  return ref;
}

// ---- CTA clicks -------------------------------------------------------------

export type LandingCtaDestination = "auth" | "internal" | "external";

export function trackLandingCtaClick(params: {
  ctaId: string;
  /** A real content section, or "sticky_mobile" for the persistent mobile CTA chrome. */
  section: LandingSectionId | "sticky_mobile";
  label: string;
  variant?: string;
  destinationType: LandingCtaDestination;
}) {
  trackEvent({
    eventName: "cta_click",
    eventCategory: EVENT_CATEGORY,
    properties: {
      cta_id: params.ctaId,
      section: params.section,
      label: params.label,
      variant: params.variant ?? "control",
      destination_type: params.destinationType,
    },
  });
}

// ---- Scroll depth -----------------------------------------------------------

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;
const scrolledDepths = new Set<number>();

function trackLandingScrollDepth(depth: number) {
  if (scrolledDepths.has(depth)) return;
  scrolledDepths.add(depth);
  trackEvent({
    eventName: "landing_scroll_depth",
    eventCategory: EVENT_CATEGORY,
    properties: { depth },
  });
}

/** Mount once at the Landing page root. Fires each of 25/50/75/100 exactly once, rAF-throttled. */
export function useLandingScrollDepth() {
  useEffect(() => {
    if (scrolledDepths.size >= SCROLL_MILESTONES.length) return;
    let ticking = false;

    const check = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = (window.scrollY / scrollable) * 100;
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m) trackLandingScrollDepth(m);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

// ---- Auth funnel --------------------------------------------------------------
// Properties are deliberately category-level only -- never an email, password,
// token, raw provider error, or raw Supabase error message.

export type AuthEntrySource = LandingSectionId | "sticky_mobile" | "direct" | "unknown";

export type AuthMethod = "email" | "google" | "apple";

export type AuthErrorCategory =
  | "invalid_input" | "account_exists" | "provider_error" | "network_error" | "unknown_error";

export function trackSignupAttempt(entrySource: AuthEntrySource, method: AuthMethod) {
  trackEvent({ eventName: "signup_attempt", eventCategory: EVENT_CATEGORY, properties: { entry_source: entrySource, method } });
}
export function trackSignupSuccess(entrySource: AuthEntrySource, method: AuthMethod) {
  trackEvent({ eventName: "signup_success", eventCategory: EVENT_CATEGORY, properties: { entry_source: entrySource, method } });
}
export function trackSignupError(entrySource: AuthEntrySource, method: AuthMethod, errorCategory: AuthErrorCategory) {
  trackEvent({ eventName: "signup_error", eventCategory: EVENT_CATEGORY, properties: { entry_source: entrySource, method, error_category: errorCategory } });
}
export function trackSigninAttempt(entrySource: AuthEntrySource, method: AuthMethod) {
  trackEvent({ eventName: "signin_attempt", eventCategory: EVENT_CATEGORY, properties: { entry_source: entrySource, method } });
}
export function trackSigninSuccess(entrySource: AuthEntrySource, method: AuthMethod) {
  trackEvent({ eventName: "signin_success", eventCategory: EVENT_CATEGORY, properties: { entry_source: entrySource, method } });
}
export function trackSigninError(entrySource: AuthEntrySource, method: AuthMethod, errorCategory: AuthErrorCategory) {
  trackEvent({ eventName: "signin_error", eventCategory: EVENT_CATEGORY, properties: { entry_source: entrySource, method, error_category: errorCategory } });
}

/** Maps a Supabase/Auth error to a safe category -- never the raw message. */
export function categorizeAuthError(error: unknown): AuthErrorCategory {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) return "account_exists";
  if (msg.includes("invalid") || msg.includes("password") || msg.includes("email")) return "invalid_input";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout")) return "network_error";
  if (msg.includes("provider") || msg.includes("oauth")) return "provider_error";
  return "unknown_error";
}

const KNOWN_ENTRY_SOURCES: readonly AuthEntrySource[] = [
  "hero", "search_tutorial", "chapter-passport", "verified_credits", "trust", "product_loop",
  "chapter-scout", "chapter-match", "chapter-studio", "meet_kreto", "creative_universe",
  "chapter-community", "for_organisations", "closing_cta", "sticky_mobile", "direct", "unknown",
];

/**
 * Reads the explicit ?src= param each Landing CTA link sets -- the CTA
 * itself knows which section it's in at click time, so this is read
 * directly rather than guessed from ?next=/referrer after the fact.
 * Falls back to "direct" (no param, e.g. a bookmarked/typed /auth visit)
 * or "unknown" (an unrecognized value, rather than trusting arbitrary input).
 */
export function resolveAuthEntrySource(searchParams: URLSearchParams): AuthEntrySource {
  const src = searchParams.get("src");
  if (!src) return "direct";
  return (KNOWN_ENTRY_SOURCES as string[]).includes(src) ? (src as AuthEntrySource) : "unknown";
}
