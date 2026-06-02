// Deck-grade instrumentation helper.
// Writes to public.analytics_events (allows anon+authed insert, admin-only read).
// All calls are best-effort and never throw.
import { supabase } from "@/integrations/supabase/client";

export type DeckEventCategory =
  | "passport"
  | "opportunity"
  | "agent"
  | "share"
  | "money";

export async function trackDeckEvent(
  event_name: string,
  event_category: DeckEventCategory,
  event_properties: Record<string, unknown> = {},
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event_name,
      event_category,
      event_properties,
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? (document.referrer || null) : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* silent */
  }
}
