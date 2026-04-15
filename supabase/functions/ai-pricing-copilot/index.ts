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

    const { messages, currency, existing_items } = await req.json();

    const systemPrompt = `You are ThriveQuote AI — an expert pricing co-pilot for creative freelancers and agencies. You help users build professional quotes and invoices by analyzing their costs and suggesting competitive pricing.

Your capabilities:
1. **Cost Analysis**: When a user shares supplier/subcontractor costs, calculate appropriate markups based on industry standards
2. **Line Item Generation**: Break down vague project descriptions into professional, detailed line items
3. **Market Pricing**: Suggest rates based on creative industry standards for the user's region
4. **Description Enhancement**: Improve service descriptions to sound more professional
5. **Terms & Notes**: Suggest professional terms, payment conditions, and notes

Currency: ${currency || "USD"}

RULES:
- Always be conversational and helpful, like a pricing mentor
- When suggesting prices, show the math (cost → markup → client price)
- Consider the creative industry context (film, design, music, photography, etc.)
- Typical creative markups: 1.5x-3x for subcontractor costs, 2x-4x for equipment
- Always suggest adding a creative direction/project management fee (10-20% of total)
- When the user is ready, use the generate_line_items tool to output structured data

${existing_items && existing_items.length > 0 ? `\nCurrent line items on the document:\n${existing_items.map((i: any, idx: number) => `${idx + 1}. "${i.description}" — Qty: ${i.quantity}, Rate: ${currency} ${i.rate}`).join("\n")}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_line_items",
              description: "Generate structured line items for the quote/invoice. Call this when the user agrees to pricing or asks to generate the quote.",
              parameters: {
                type: "object",
                properties: {
                  line_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string", description: "Professional service description" },
                        quantity: { type: "number", description: "Quantity (default 1)" },
                        rate: { type: "number", description: "Rate per unit in the specified currency" },
                      },
                      required: ["description", "quantity", "rate"],
                    },
                  },
                  suggested_notes: { type: "string", description: "Suggested notes for the document" },
                  suggested_terms: { type: "string", description: "Suggested terms and conditions" },
                  suggested_tax_rate: { type: "number", description: "Suggested tax rate percentage if applicable" },
                },
                required: ["line_items"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "enhance_descriptions",
              description: "Improve existing line item descriptions to be more professional",
              parameters: {
                type: "object",
                properties: {
                  enhanced_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original: { type: "string" },
                        enhanced: { type: "string" },
                        suggested_rate: { type: "number", description: "Optionally suggest a better rate" },
                      },
                      required: ["original", "enhanced"],
                    },
                  },
                },
                required: ["enhanced_items"],
              },
            },
          },
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    console.error("ai-pricing-copilot error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
