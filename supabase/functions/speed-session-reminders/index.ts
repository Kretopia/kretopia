// Cron-driven Speed Session reminder dispatcher.
// Runs every 2 minutes. Idempotent via speed_sessions.reminder_sent_at.
//
// 10 minutes before a scheduled session starts, we ping every RSVP'd user
// with an in-app notification so they remember to show up.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://www.thrivein.io";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const stats = { sessions: 0, sends: 0, errors: 0 };
  const now = new Date();
  // Window: 8 to 12 minutes from now, never-reminded, scheduled.
  const lo = new Date(now.getTime() + 8 * 60_000).toISOString();
  const hi = new Date(now.getTime() + 12 * 60_000).toISOString();

  const { data: sessions, error } = await admin
    .from("speed_sessions")
    .select("id, title, starts_at, slot_seconds, mode")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("starts_at", lo)
    .lte("starts_at", hi);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const s of sessions ?? []) {
    stats.sessions++;
    try {
      const { data: rsvps } = await admin
        .from("speed_session_rsvps")
        .select("user_id")
        .eq("session_id", s.id);

      const userIds = (rsvps ?? []).map((r: { user_id: string }) => r.user_id);
      if (userIds.length > 0) {
        const link = `${APP_URL}/circle/speed/${s.id}`;
        const rows = userIds.map((uid) => ({
          user_id: uid,
          type: "speed_session_reminder",
          title: "Starts in 10 minutes — ready?",
          message: `"${s.title}" kicks off soon. Open the room and hit "I'm here" to enter the matching pool.`,
          link,
          action_url: link,
          action_text: "Open room",
          priority: "high",
          category: "session",
        }));
        const { error: insErr } = await admin.from("notifications").insert(rows);
        if (insErr) { stats.errors++; console.error("[speed-session-reminders] notify", insErr); }
        else stats.sends += rows.length;
      }

      await admin
        .from("speed_sessions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", s.id);
    } catch (e) {
      stats.errors++;
      console.error("[speed-session-reminders] session", s.id, e);
    }
  }

  return new Response(JSON.stringify({ ok: true, ...stats }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
