// Thrive Voice — push-to-talk client helper.
// Handles MediaRecorder lifecycle, base64 encoding, edge-function call,
// and audio playback. Returns transcript + reply for the chat to render.

import { supabase } from "@/integrations/supabase/client";

const VOICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/thrive-voice-turn`;

export interface VoiceTurnResult {
  ok: true;
  transcript: string;
  reply: string;
  audioUrl: string | null;
  usage?: { used: number; cap: number; tier: string };
}

export interface VoiceTurnError {
  ok: false;
  code: string;
  message: string;
  transcript?: string;
  used?: number;
  cap?: number;
  tier?: string;
}

let activeRecorder: MediaRecorder | null = null;
let activeStream: MediaStream | null = null;
let chunks: BlobPart[] = [];
let currentAudio: HTMLAudioElement | null = null;

export function isRecording() {
  return activeRecorder?.state === "recording";
}

export async function startRecording(): Promise<void> {
  if (activeRecorder) throw new Error("Already recording");
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone not supported on this device");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  activeStream = stream;
  chunks = [];
  // Prefer opus/webm; fall back to default
  const mime =
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime });
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  rec.start(250);
  activeRecorder = rec;
}

function teardown() {
  try {
    activeStream?.getTracks().forEach((t) => t.stop());
  } catch { /* ignore */ }
  activeRecorder = null;
  activeStream = null;
  chunks = [];
}

export function cancelRecording() {
  try {
    activeRecorder?.stop();
  } catch { /* ignore */ }
  teardown();
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunked btoa to avoid call-stack overflow on large audio
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function stopAndSend(opts: {
  surface?: string;
  surfaceContext?: Record<string, unknown>;
}): Promise<VoiceTurnResult | VoiceTurnError> {
  const rec = activeRecorder;
  if (!rec) {
    return { ok: false, code: "not_recording", message: "Nothing to send." };
  }
  // Wait for the final dataavailable
  const stopped: Blob = await new Promise((resolve) => {
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      resolve(blob);
    };
    try { rec.stop(); } catch { resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" })); }
  });
  teardown();

  if (stopped.size < 800) {
    return { ok: false, code: "too_short", message: "Hold the mic and speak — that was too short." };
  }

  const audio_base64 = await blobToBase64(stopped);

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { ok: false, code: "auth", message: "Please sign in to talk to Thrive." };
  }

  let resp: Response;
  try {
    resp = await fetch(VOICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        audio_base64,
        mime_type: stopped.type || "audio/webm",
        surface: opts.surface,
        surface_context: opts.surfaceContext,
      }),
    });
  } catch (e) {
    return { ok: false, code: "network", message: e instanceof Error ? e.message : "Network error" };
  }

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok || data?.error) {
    if (data?.error === "voice_daily_limit") {
      return {
        ok: false,
        code: "voice_daily_limit",
        message: `You've used today's free voice minutes. Upgrade for more.`,
        transcript: data.transcript,
        used: data.used,
        cap: data.cap,
        tier: data.tier,
      };
    }
    if (data?.error === "no_speech_detected") {
      return { ok: false, code: "no_speech", message: "Didn't catch that — try speaking clearly into the mic." };
    }
    return {
      ok: false,
      code: data?.error || "unknown",
      message: data?.error === "rate_limited"
        ? "Slow down a sec — try again in a moment."
        : data?.error === "ai_credits_exhausted"
          ? "Thrive Voice is out of credits this month."
          : "Voice turn failed. Try again.",
      transcript: data?.transcript,
    };
  }

  let audioUrl: string | null = null;
  if (data.audio_base64) {
    audioUrl = `data:${data.audio_mime || "audio/mpeg"};base64,${data.audio_base64}`;
  }

  return {
    ok: true,
    transcript: data.transcript,
    reply: data.reply,
    audioUrl,
    usage: data.usage,
  };
}

export function playAudio(url: string): HTMLAudioElement {
  stopPlayback();
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play().catch((e) => console.warn("voice playback failed", e));
  return audio;
}

export function stopPlayback() {
  try {
    currentAudio?.pause();
    currentAudio = null;
  } catch { /* ignore */ }
}
