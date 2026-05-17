import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_API = "https://api.daily.co/v1";

/**
 * Open Stage creator — spins a Daily room (audio or video) and inserts
 * a sound_stages row. Returns host meeting token + room URL.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) throw new Error("DAILY_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim().slice(0, 100) || "Open Stage";
    const vibe_tag = body.vibe_tag ? String(body.vibe_tag).slice(0, 40) : null;
    const mode = body.mode === "audio" ? "audio" : "video";
    const format =
      body.format === "open_1to1" || body.format === "audience"
        ? body.format
        : "open_group";
    const user_name = String(body.user_name ?? "Host").slice(0, 60);

    const maxParticipants = format === "audience" ? 200 : format === "open_1to1" ? 2 : 50;

    const roomName = `ss-${crypto.randomUUID().replace(/-/g, "").slice(0, 30)}`;
    const exp = Math.floor(Date.now() / 1000) + 4 * 60 * 60; // 4h

    const createRes = await fetch(`${DAILY_API}/rooms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DAILY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp,
          max_participants: maxParticipants,
          enable_chat: true,
          enable_screenshare: mode === "video",
          enable_knocking: false,
          enable_prejoin_ui: false,
          start_video_off: mode === "audio",
          start_audio_off: false,
        },
      }),
    });
    if (!createRes.ok) {
      const e = await createRes.text();
      throw new Error(`Daily create failed: ${createRes.status} ${e}`);
    }
    const room = await createRes.json();

    const tokenRes = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DAILY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name,
          user_id: userId,
          is_owner: true,
          exp,
        },
      }),
    });
    if (!tokenRes.ok) throw new Error(`Daily token failed: ${tokenRes.status}`);
    const { token: meetingToken } = await tokenRes.json();

    const { data: stage, error: insErr } = await admin
      .from("sound_stages")
      .insert({
        host_user_id: userId,
        title,
        vibe_tag,
        mode,
        format,
        room_url: room.url,
        room_name: roomName,
        is_live: true,
        participant_count: 1,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        stage_id: stage?.id,
        room_url: room.url,
        room_name: roomName,
        token: meetingToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("[create-sound-stage]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
