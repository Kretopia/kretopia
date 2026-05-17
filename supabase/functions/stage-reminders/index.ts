import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Run every 15 minutes. Sends 24h, 1h, and 15min reminders to RSVP'd users
// for scheduled curated_stages. Idempotent via curated_stage_reminders_sent table.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = Date.now();
    const windows = [
      { kind: "24h", minMin: 23 * 60 + 45, maxMin: 24 * 60 + 15 },
      { kind: "1h", minMin: 45, maxMin: 75 },
      { kind: "15m", minMin: 10, maxMin: 20 },
    ];

    let totalSent = 0;
    for (const w of windows) {
      const fromIso = new Date(now + w.minMin * 60_000).toISOString();
      const toIso = new Date(now + w.maxMin * 60_000).toISOString();

      const { data: stages } = await admin
        .from("curated_stages")
        .select("id, title, starts_at, host_user_id, type")
        .eq("status", "scheduled")
        .gte("starts_at", fromIso)
        .lte("starts_at", toIso);

      if (!stages?.length) continue;

      for (const stage of stages) {
        // Skip if already sent for this window
        const { data: existing } = await admin
          .from("curated_stage_reminders_sent")
          .select("id")
          .eq("stage_id", stage.id)
          .eq("kind", w.kind)
          .maybeSingle();
        if (existing) continue;

        const { data: rsvps } = await admin
          .from("curated_stage_rsvps")
          .select("user_id")
          .eq("stage_id", stage.id)
          .in("status", ["rsvp", "attended"]);

        const recipients = new Set<string>((rsvps ?? []).map((r) => r.user_id));
        recipients.add(stage.host_user_id);

        const friendly =
          w.kind === "24h" ? "in 24 hours" : w.kind === "1h" ? "in 1 hour" : "in 15 minutes";

        const notifs = Array.from(recipients).map((uid) => ({
          user_id: uid,
          type: "stage_reminder",
          title: `"${stage.title}" starts ${friendly}`,
          message:
            stage.type === "scout"
              ? "Scout Stage going live soon — tap to enter the lobby."
              : "Showcase Stage going live soon — tap to enter the lobby.",
          action_url: `/circle/stage/${stage.id}`,
        }));

        if (notifs.length) {
          await admin.from("notifications").insert(notifs).catch(() => {});
          totalSent += notifs.length;
        }

        await admin
          .from("curated_stage_reminders_sent")
          .insert({ stage_id: stage.id, kind: w.kind })
          .catch(() => {});
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("[stage-reminders]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
