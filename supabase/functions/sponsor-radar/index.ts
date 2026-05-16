// Sponsor Radar — uses LLM to generate sponsor/brand opportunities matched to creator's niche.
// On-demand: { user_id, niche?: string, count?: number }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const auth = req.headers.get("authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const count = Math.min(8, Number(body.count) || 5);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, primary_role, sub_roles, skills, location, country, bio")
      .eq("user_id", userId)
      .maybeSingle();

    const niche = body.niche || profile?.primary_role || "creative";
    const region = profile?.location || profile?.country || "global";

    const tools = [{
      type: "function",
      function: {
        name: "emit_sponsor_leads",
        description: "Emit a list of brand sponsor leads matched to creator",
        parameters: {
          type: "object",
          properties: {
            leads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  brand_name: { type: "string" },
                  brand_url: { type: "string" },
                  niche: { type: "string" },
                  fit_score: { type: "integer", minimum: 0, maximum: 100 },
                  reason: { type: "string", description: "1-2 sentences why they fit" },
                  pitch_draft: { type: "string", description: "3-4 sentence outreach pitch in creator's voice" },
                  contact_hint: { type: "string", description: "Where to find contact (e.g., partnerships@brand.com)" },
                },
                required: ["brand_name", "fit_score", "reason", "pitch_draft"],
              },
            },
          },
          required: ["leads"],
        },
      },
    }];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: "You are a creator-economy talent agent. Suggest realistic, well-known and emerging brands likely to sponsor this creator. Be specific and avoid generic suggestions." },
          {
            role: "user",
            content: `Creator profile:\n- Name: ${profile?.display_name}\n- Role: ${profile?.primary_role}\n- Niche: ${niche}\n- Skills: ${(profile?.skills || []).slice(0, 12).join(", ")}\n- Region: ${region}\n- Bio: ${(profile?.bio || "").slice(0, 400)}\n\nGenerate ${count} sponsor leads with realistic fit_score, a personalized reason, and a ready-to-send 3-4 sentence pitch in the creator's voice. Prefer brands that actively sponsor creators in this niche.`,
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "emit_sponsor_leads" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI", res.status, t);
      return new Response(JSON.stringify({ error: "ai_failed", status: res.status }), { status: 502, headers: corsHeaders });
    }
    const j = await res.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { leads: [] };

    const rows = (parsed.leads || []).map((l: any) => ({
      user_id: userId,
      brand_name: l.brand_name,
      brand_url: l.brand_url || null,
      niche: l.niche || niche,
      fit_score: Math.max(0, Math.min(100, l.fit_score || 50)),
      reason: l.reason,
      pitch_draft: l.pitch_draft,
      contact_info: l.contact_hint ? { hint: l.contact_hint } : {},
      source: "ai_radar",
    }));

    if (rows.length) {
      const { error } = await supabase.from("sponsor_leads").insert(rows);
      if (error) console.error("insert sponsor_leads", error);
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length, leads: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
