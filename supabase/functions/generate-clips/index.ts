// Producer's Clip Generator + Sponsor Match
// Input: { transcript: string, episode_title?: string, project_id?: string, max_clips?: number }
// Output: { clips: [{ start_seconds, end_seconds, hook, caption, hashtags[] }], sponsors: [{ label, why }] }
//
// Uses Lovable AI Gateway (google/gemini-2.5-flash) — no key needed.
// Pulls vendor/sponsor memory from thrive_memory if user is authed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are "Producer", ThriveIN's clip-generation specialist for creators.
Given a podcast/video transcript, propose 3-5 short, scroll-stopping clips for social.
Each clip must:
- 25-75 seconds long, anchored to a clear hook (quote, surprise, payoff)
- Use start/end timestamps in SECONDS estimated from transcript line position
- Include a punchy 1-line caption (no clickbait, no emojis), and 3-6 hashtags

If sponsors/vendors are provided in the user's memory, suggest which one each clip best fits, with a 1-sentence reason.

Output STRICT JSON:
{
  "clips": [{"start_seconds": number, "end_seconds": number, "hook": string, "caption": string, "hashtags": string[]}],
  "sponsors": [{"label": string, "why": string}]
}
No prose, no markdown, JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const transcript: string = (body?.transcript || "").toString();
    const episodeTitle: string = (body?.episode_title || "").toString();
    const maxClips: number = Math.min(Math.max(Number(body?.max_clips) || 4, 2), 6);

    if (!transcript || transcript.trim().length < 80) {
      return json({ error: "Transcript too short. Need at least a paragraph." }, 400);
    }

    // Pull sponsor/vendor memory (best-effort)
    let memorySummary = "";
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
      const auth = req.headers.get("Authorization") || "";
      if (auth) {
        const userClient = createClient(SUPABASE_URL, ANON, {
          global: { headers: { Authorization: auth } },
        });
        const { data: u } = await userClient.auth.getUser();
        if (u?.user?.id) {
          const { data: mems } = await userClient
            .from("thrive_memory")
            .select("kind, label, body")
            .eq("user_id", u.user.id)
            .in("kind", ["sponsor", "vendor", "brand"])
            .order("importance", { ascending: false })
            .limit(12);
          if (mems?.length) {
            memorySummary =
              "\nUser's known sponsors/vendors (suggest matches when relevant):\n" +
              mems.map((m: any) => `- ${m.label}${m.body ? ": " + m.body : ""}`).join("\n");
          }
        }
      }
    } catch (e) {
      console.warn("[generate-clips] memory fetch", e);
    }

    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) return json({ error: "AI gateway not configured" }, 500);

    const userPrompt = `Episode: ${episodeTitle || "(untitled)"}
Generate up to ${maxClips} clips.${memorySummary}

TRANSCRIPT:
${transcript.slice(0, 18000)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limited, try again soon" }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: `AI error: ${t.slice(0, 300)}` }, 500);
    }

    const ai = await resp.json();
    const content = ai?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    const clips = Array.isArray(parsed?.clips) ? parsed.clips.slice(0, maxClips) : [];
    const sponsors = Array.isArray(parsed?.sponsors) ? parsed.sponsors.slice(0, 6) : [];

    return json({ clips, sponsors });
  } catch (e) {
    console.error("[generate-clips]", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
