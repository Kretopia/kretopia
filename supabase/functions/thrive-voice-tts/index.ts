// Thrive Voice TTS — synthesizes the agent's reply with ElevenLabs.
// Returns base64 audio (mp3) or { tts_fallback: true } so the client can use
// browser SpeechSynthesis.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encodeBase64 as b64encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || "";

// Default voice — warm, professional. (Sarah)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = "eleven_turbo_v2_5";

interface ReqBody {
  text: string;
  voice_id?: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    // Auth — keep TTS gated to signed-in users.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse({ error: "missing_auth" }, 401);
    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "invalid_auth" }, 401);

    const body = (await req.json()) as ReqBody;
    const text = (body?.text || "").trim();
    if (!text) return jsonResponse({ error: "missing_text" }, 400);
    // Cap reply length so we don't burn ElevenLabs credits on huge bodies.
    const speakText = text.length > 1200 ? text.slice(0, 1200) : text;

    if (!ELEVENLABS_API_KEY) {
      return jsonResponse({ tts_fallback: true, tts_error: "elevenlabs_not_configured" });
    }

    const voiceId = body.voice_id || DEFAULT_VOICE_ID;
    try {
      const ttsResp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: speakText,
            model_id: TTS_MODEL,
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.75,
              style: 0.35,
              use_speaker_boost: true,
              speed: 1.0,
            },
          }),
        },
      );
      if (!ttsResp.ok) {
        const err = await ttsResp.text();
        console.error("TTS failed", ttsResp.status, err);
        const code = /detected_unusual_activity|Free Tier/i.test(err)
          ? "voice_provider_free_tier_blocked"
          : `tts_${ttsResp.status}`;
        return jsonResponse({ tts_fallback: true, tts_error: code });
      }
      const audioBuf = new Uint8Array(await ttsResp.arrayBuffer());
      return jsonResponse({
        ok: true,
        audio_base64: b64encode(audioBuf),
        audio_mime: "audio/mpeg",
      });
    } catch (e) {
      console.error("TTS exception", e);
      return jsonResponse({ tts_fallback: true, tts_error: "tts_network_error" });
    }
  } catch (e) {
    console.error("voice-tts fatal", e);
    return jsonResponse(
      { error: "internal", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
