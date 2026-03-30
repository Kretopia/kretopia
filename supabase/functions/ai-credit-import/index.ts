import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, content, userId } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt = "";
    if (type === "link") {
      prompt = `Given this URL to a creative work: "${content}"
      
Extract the following information and return as JSON:
- project_name: The name/title of the project (e.g. song title, video title, campaign name)
- role: The most likely role the person had (e.g. "Director", "Producer", "Designer"). If unclear, leave empty.
- project_type: One of: music, film, design, photography, fashion, event, brand, other

Return ONLY valid JSON with these three fields. If you can't determine something, use an empty string.`;
    } else {
      prompt = `A creative professional described a project they worked on: "${content}"
      
Extract/structure this into a credit entry. Return as JSON:
- project_name: A clean, professional project name
- role: Their specific role on this project
- project_type: One of: music, film, design, photography, fashion, event, brand, other

Return ONLY valid JSON with these three fields.`;
    }

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract creative project credits from descriptions or URLs. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { project_name: "", role: "", project_type: "" };
    }

    return new Response(JSON.stringify({
      project_name: parsed.project_name || "",
      role: parsed.role || "",
      project_type: parsed.project_type || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
