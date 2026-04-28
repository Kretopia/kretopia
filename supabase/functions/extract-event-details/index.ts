import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EVENT_CATEGORIES = [
  "music", "film", "photo", "art", "podcast", "content",
  "workshop", "networking", "festival", "showcase", "general",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace("Bearer ", "") || "",
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, image_base64 } = await req.json();
    if (!text && !image_base64) {
      return new Response(JSON.stringify({ error: "Provide text or image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are an event flyer parser AND copywriter. Extract structured event details from the provided flyer image and/or text. Read EVERY visible detail carefully — title, date, time, venue, address, ticket info, who's hosting/performing.

Today's date is ${today}. If a date is shown without a year, assume the next upcoming occurrence.

For "description", don't just transcribe — rewrite as a polished, inviting event description (2–4 short paragraphs). Capture the vibe and what guests can expect. Use line breaks for readability.

Return a JSON object with these fields:
- title: string (clean event title, properly capitalized)
- description: string (polished, warm description rewritten from the flyer)
- category: string (one of: ${EVENT_CATEGORIES.join(", ")})
- start_date: string or null (ISO date "YYYY-MM-DD")
- start_time: string or null ("HH:MM" 24-hour)
- venue_name: string or null
- venue_address: string or null
- max_participants: number or null
- is_ticketed: boolean
- ticket_price: number or null
- ticket_currency: string or null (3-letter ISO, e.g., "USD", "TTD", "EUR")
- external_ticket_url: string or null

Be thorough but concise. If a field isn't visible, use null. Never invent details.`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (image_base64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: text
              ? `Extract event details from this flyer image and any extra text:\n${text}`
              : "Extract event details from this flyer image:",
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Extract event details from this text:\n\n${text}`,
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("AI did not return any content");

    let extracted: any;
    try {
      extracted = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[1].trim());
      else throw new Error("Could not parse AI response as JSON");
    }

    if (!extracted.category || !EVENT_CATEGORIES.includes(extracted.category)) {
      extracted.category = "general";
    }

    return new Response(JSON.stringify({ success: true, extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-event-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
