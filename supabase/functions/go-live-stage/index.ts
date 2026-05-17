import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_API = "https://api.daily.co/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) throw new Error("DAILY_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { stage_id, user_name } = await req.json().catch(() => ({}));
    if (!stage_id) throw new Error("stage_id required");

    const { data: stage } = await admin.from("curated_stages").select("*").eq("id", stage_id).single();
    if (!stage) throw new Error("Stage not found");

    const isHost = stage.host_user_id === user.id;

    // Lazy-create Daily room on first go-live
    let roomUrl = stage.room_url;
    let roomName = stage.room_name;
    if (!roomName) {
      if (!isHost) throw new Error("Only host can start the stage");
      const exp = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
      roomName = `cs-${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`;
      const createRes = await fetch(`${DAILY_API}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${DAILY_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
          properties: {
            exp,
            max_participants: Math.min(stage.capacity + 10, 200),
            enable_chat: true,
            enable_screenshare: true,
            enable_knocking: false,
            enable_prejoin_ui: false,
            enable_recording: stage.recording_enabled ? "cloud" : undefined,
          },
        }),
      });
      if (!createRes.ok) throw new Error(`Daily create failed: ${createRes.status}`);
      const room = await createRes.json();
      roomUrl = room.url;
      await admin.from("curated_stages").update({
        room_url: roomUrl, room_name: roomName, status: "live",
      }).eq("id", stage_id);
    } else if (isHost && stage.status !== "live") {
      await admin.from("curated_stages").update({ status: "live" }).eq("id", stage_id);
    }

    // For audience members on a Scout/Showcase, they join as listeners — they don't get audio/video until pulled up.
    // For the host they get owner token. We'll keep it simple: audience joins with non-owner token, host with owner token.
    const tokenRes = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DAILY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: String(user_name || "Guest").slice(0, 60),
          user_id: user.id,
          is_owner: isHost,
          exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
          start_video_off: !isHost,
          start_audio_off: !isHost,
        },
      }),
    });
    if (!tokenRes.ok) throw new Error(`Daily token failed: ${tokenRes.status}`);
    const { token } = await tokenRes.json();

    // Mark attendance
    await admin.from("curated_stage_rsvps")
      .update({ status: "attended", joined_at: new Date().toISOString() })
      .eq("stage_id", stage_id).eq("user_id", user.id);

    return new Response(JSON.stringify({ room_url: roomUrl, room_name: roomName, token, is_host: isHost }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    console.error("[go-live-stage]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
