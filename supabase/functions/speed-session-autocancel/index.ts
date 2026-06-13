// Auto-cancel under-attended Speed Sessions.
// Runs every 5 minutes. If a scheduled session starts in 25–35 min and has
// fewer than 5 RSVPs, it's canceled and every RSVP'd user gets a soft
// "we're rescheduling" ping so they don't show up to a dead room.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://www.thrivein.io";
const MIN_TO_RUN = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const stats = { checked: 0, canceled: 0, notified: 0, errors: 0 };
  const now = new Date();
  const lo = new Date(now.getTime() + 25 * 60_000).toISOString();
  const hi = new Date(now.getTime() + 35 * 60_000).toISOString();

  const { data: sessions, error } = await admin
    .from("speed_sessions")
    .select("id, title, starts_at")
    .eq("status", "scheduled")
    .is("canceled_reason", null)
    .gte("starts_at", lo)
    .lte("starts_at", hi);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const s of sessions ?? []) {
    stats.checked++;
    try {
      const { count } = await admin
        .from("speed_session_rsvps")
        .select("user_id", { count: "exact", head: true })
        .eq("session_id", s.id);

      if ((count ?? 0) >= MIN_TO_RUN) continue;

      await admin
        .from("speed_sessions")
        .update({ status: "canceled", canceled_reason: `Under ${MIN_TO_RUN} RSVPs at T-30` })
        .eq("id", s.id);
      stats.canceled++;

      const { data: rsvps } = await admin
        .from("speed_session_rsvps").select("user_id").eq("session_id", s.id);

      const rows = (rsvps ?? []).map((r: { user_id: string }) => ({
        user_id: r.user_id,
        type: "speed_session_canceled",
        title: "Tonight's Speed Session is rescheduled",
        message: `"${s.title}" didn't hit ${MIN_TO_RUN} RSVPs — we're rebooking it so you actually meet people. We'll ping you with the next slot.`,
        link: `${APP_URL}/circle/speed`,
        action_url: `${APP_URL}/circle/speed`,
        action_text: "Browse upcoming nights",
        priority: "high",
        category: "session",
      }));
      if (rows.length > 0) {
        const { error: nErr } = await admin.from("notifications").insert(rows);
        if (nErr) { stats.errors++; console.error("[autocancel] notify", nErr); }
        else stats.notified += rows.length;
      }
    } catch (e) {
      stats.errors++;
      console.error("[autocancel] session", s.id, e);
    }
  }

  return new Response(JSON.stringify({ ok: true, ...stats }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
