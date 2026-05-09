// Thrive Voice — push-to-talk turn handler.
// Pipeline: ElevenLabs STT -> Lovable AI brain -> ElevenLabs TTS.
// Persists the user transcript + assistant reply into the canonical Copilot
// thread so voice and text history stay merged across surfaces.
//
// Tier-gated via consume_voice_seconds RPC (free 2min/day, Creator 15min,
// Creator+ 60min, Founder unlimited).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encodeBase64 as b64encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Default voice — warm, professional. (Sarah)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = "eleven_turbo_v2_5";
const STT_MODEL = "scribe_v2";
const BRAIN_MODEL = "google/gemini-2.5-flash";

interface ReqBody {
  audio_base64: string;
  mime_type?: string;
  surface?: string;
  surface_context?: Record<string, unknown>;
  voice_id?: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse({ error: "missing_auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "invalid_auth" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const body = (await req.json()) as ReqBody;
    if (!body?.audio_base64) return jsonResponse({ error: "missing_audio" }, 400);

    const audioBytes = base64ToBytes(body.audio_base64);
    if (audioBytes.length === 0) return jsonResponse({ error: "empty_audio" }, 400);
    if (audioBytes.length > 8 * 1024 * 1024) {
      return jsonResponse({ error: "audio_too_large", max_mb: 8 }, 413);
    }

    const mime = body.mime_type || "audio/webm";

    // --- 1) STT via ElevenLabs ---
    const sttForm = new FormData();
    sttForm.append("file", new Blob([audioBytes], { type: mime }), "voice.webm");
    sttForm.append("model_id", STT_MODEL);
    sttForm.append("language_code", "eng");

    const sttResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: sttForm,
    });
    if (!sttResp.ok) {
      const err = await sttResp.text();
      console.error("STT failed", sttResp.status, err);
      return jsonResponse({ error: "stt_failed", detail: err }, 502);
    }
    const sttJson = await sttResp.json();
    const transcript: string = (sttJson?.text || "").trim();
    if (!transcript) {
      return jsonResponse({ error: "no_speech_detected" }, 400);
    }

    // Estimate seconds from audio bytes (rough: webm/opus ~ 16kbps avg)
    let seconds = 0;
    if (Array.isArray(sttJson?.words) && sttJson.words.length) {
      const last = sttJson.words[sttJson.words.length - 1];
      seconds = Math.max(1, Math.ceil(Number(last?.end || 0)));
    } else {
      seconds = Math.max(1, Math.ceil(audioBytes.length / 2000));
    }

    // --- 2) Tier gate ---
    const { data: gate, error: gateErr } = await admin.rpc("consume_voice_seconds", {
      _seconds: seconds,
    });
    if (gateErr) {
      console.error("voice gate error", gateErr);
      return jsonResponse({ error: "gate_failed", detail: gateErr.message }, 500);
    }
    if (gate && (gate as { ok?: boolean }).ok === false) {
      return jsonResponse(
        {
          error: "voice_daily_limit",
          ...(gate as Record<string, unknown>),
          transcript, // still return so client can show what user said
        },
        429,
      );
    }

    // --- 3) Brain: keep it simple, fast, warm-spoken. ---
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, headline, location_city")
      .eq("user_id", userId)
      .maybeSingle();
    const firstName = (profile?.full_name || "").trim().split(/\s+/)[0] || "there";

    // Get-or-create canonical Copilot thread
    let convId: string | null = null;
    {
      const { data: convo } = await admin
        .from("ai_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("title", "__copilot__")
        .maybeSingle();
      if (convo?.id) {
        convId = convo.id;
      } else {
        const { data: created } = await admin
          .from("ai_conversations")
          .insert({ user_id: userId, title: "__copilot__" })
          .select("id")
          .maybeSingle();
        convId = created?.id ?? null;
      }
    }

    // Pull last 10 turns for short-term memory.
    let history: { role: string; content: string }[] = [];
    if (convId) {
      const { data: rows } = await admin
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(10);
      history = (rows ?? []).reverse();
    }

    const surface = body.surface || "home";
    const sysPrompt = `You are Thrive — a warm, sharp creative-business sidekick speaking out loud to ${firstName}.
You are SPEAKING, not writing. Rules:
- Keep replies to 1–3 short sentences (under 60 words).
- No markdown, no lists, no emoji, no code blocks.
- Sound human. Contractions. Light warmth. Never robotic.
- If the user asks you to DO something (draft, send, create, schedule), say what you'll tee up and tell them to tap the action card that appears in chat.
- Never invent data you don't have — ask one quick clarifying question instead.
Surface: ${surface}. ${profile?.location_city ? `User is in ${profile.location_city}.` : ""}`;

    const brainResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: BRAIN_MODEL,
        messages: [
          { role: "system", content: sysPrompt },
          ...history,
          { role: "user", content: transcript },
        ],
        max_tokens: 220,
        temperature: 0.6,
      }),
    });
    if (!brainResp.ok) {
      const err = await brainResp.text();
      console.error("brain failed", brainResp.status, err);
      if (brainResp.status === 429) {
        return jsonResponse({ error: "rate_limited", transcript }, 429);
      }
      if (brainResp.status === 402) {
        return jsonResponse({ error: "ai_credits_exhausted", transcript }, 402);
      }
      return jsonResponse({ error: "brain_failed", transcript }, 502);
    }
    const brainJson = await brainResp.json();
    const reply: string =
      (brainJson?.choices?.[0]?.message?.content || "").trim() ||
      "Sorry — I didn't catch a clear answer for that. Try again?";

    // --- 4) TTS via ElevenLabs ---
    const voiceId = body.voice_id || DEFAULT_VOICE_ID;
    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: reply,
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
      return jsonResponse({
        ok: true,
        transcript,
        reply,
        audio_base64: null,
        tts_error: err,
        usage: gate,
      });
    }
    const audioBuf = new Uint8Array(await ttsResp.arrayBuffer());
    const audioB64 = b64encode(audioBuf);

    // --- 5) Persist turns (fire-and-forget) ---
    if (convId) {
      admin
        .from("ai_messages")
        .insert([
          { conversation_id: convId, role: "user", content: transcript },
          { conversation_id: convId, role: "assistant", content: reply },
        ])
        .then(() => {}, () => {});
      admin
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId)
        .then(() => {}, () => {});
    }

    return jsonResponse({
      ok: true,
      transcript,
      reply,
      audio_base64: audioB64,
      audio_mime: "audio/mpeg",
      conversation_id: convId,
      usage: gate,
    });
  } catch (e) {
    console.error("voice-turn fatal", e);
    return jsonResponse(
      { error: "internal", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
