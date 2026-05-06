// Generate short-form clip ideas + per-platform captions from a transcript excerpt.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You're a short-form video editor. Given a podcast transcript excerpt, produce 3 clip ideas. Each: a punchy title, the strongest 1-2 sentence quote (verbatim), and platform-specific captions for instagram, tiktok, x, youtube. Hashtags: 3-6 relevant tags, no spam.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const { transcript_excerpt, episode_title, guest_names } = await req.json();
    if (!transcript_excerpt || transcript_excerpt.length < 50) {
      return new Response(JSON.stringify({ error: "transcript_excerpt too short" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Episode: ${episode_title || "Untitled"}\nGuests: ${(guest_names || []).join(", ") || "none"}\n\nTranscript:\n${transcript_excerpt.slice(0, 8000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "make_clips",
            description: "Return clip drafts.",
            parameters: {
              type: "object",
              properties: {
                clips: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      excerpt: { type: "string" },
                      captions: {
                        type: "object",
                        properties: {
                          instagram: { type: "string" },
                          tiktok: { type: "string" },
                          x: { type: "string" },
                          youtube: { type: "string" },
                        },
                        required: ["instagram", "tiktok", "x", "youtube"],
                        additionalProperties: false,
                      },
                      hashtags: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "excerpt", "captions", "hashtags"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["clips"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "make_clips" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Out of AI credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return new Response(JSON.stringify({ clips: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const parsed = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(parsed), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-clips error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
