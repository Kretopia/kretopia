// Ambassador referral attribution
// 1. Captures ?amb=CODE from any URL into sessionStorage on first arrival.
// 2. After sign-in, writes the code to profiles.referred_by_ambassador (one-shot).

import { supabase } from "@/integrations/supabase/client";

const KEY = "thrivein_amb_code";

/** Call once on app boot (or any time on landing) to capture ?amb= */
export function captureAmbassadorCodeFromUrl() {
  try {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("amb");
    if (!code) return;
    const clean = code.trim().toUpperCase().slice(0, 12);
    if (clean) sessionStorage.setItem(KEY, clean);
  } catch {
    // ignore
  }
}

/** After auth, attach the captured code to the user's profile (idempotent). */
export async function attachAmbassadorCodeToProfile(userId: string) {
  try {
    const code = sessionStorage.getItem(KEY);
    if (!code) return;
    // Verify the code corresponds to a real ambassador (RPC ignores invalid codes)
    const { data: amb } = await supabase.rpc("get_ambassador_by_code", { _code: code });
    if (!amb || (Array.isArray(amb) && amb.length === 0)) {
      sessionStorage.removeItem(KEY);
      return;
    }
    // Don't overwrite if already set
    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by_ambassador")
      .eq("user_id", userId)
      .maybeSingle();
    const p = profile as { referred_by_ambassador: string | null } | null;
    if (p && !p.referred_by_ambassador) {
      await supabase
        .from("profiles")
        .update({ referred_by_ambassador: code })
        .eq("user_id", userId);
    }
    sessionStorage.removeItem(KEY);
  } catch (e) {
    console.warn("[ambassadorAttribution] attach failed", e);
  }
}
