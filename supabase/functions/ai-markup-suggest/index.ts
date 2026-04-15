import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { line_items, currency } = await req.json();

    const itemsList = line_items
      .map((i: any, idx: number) => `${idx + 1}. "${i.description}" — Qty: ${i.quantity}, Rate: ${currency} ${i.rate}`)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a freelance pricing expert for the creative industry. Given line items from an invoice or quote, suggest an appropriate markup percentage. Consider:
- Industry standards for creative/media work (typically 15-100%)
- Rush work typically gets 50-100% markup
- Agency-level work gets 25-50%
- Standard freelance gets 15-30%
- Consider the type of work described in each line item
Always return structured data via the tool provided.`,
          },
          {
            role: "user",
            content: `Analyze these line items and suggest a markup:\n\n${itemsList}\n\nCurrency: ${currency}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_markup",
              description: "Return markup suggestion with per-item breakdown",
              parameters: {
                type: "object",
                properties: {
                  suggested_markup: { type: "number", description: "Suggested markup percentage (e.g. 25 for 25%)" },
                  reasoning: { type: "string", description: "Brief explanation of why this markup is appropriate (2-3 sentences)" },
                  industry_range: { type: "string", description: "Typical range for this type of work (e.g. '20-40%')" },
                  adjusted_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        original_rate: { type: "number" },
                        suggested_rate: { type: "number" },
                      },
                      required: ["description", "original_rate", "suggested_rate"],
                    },
                  },
                },
                required: ["suggested_markup", "reasoning", "industry_range", "adjusted_items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_markup" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-markup-suggest error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
