import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const allowedCategories = new Set([
  "software", "equipment", "travel", "workspace", "marketing", "education", "subscriptions", "food", "insurance", "taxes", "contractors", "entertainment", "carnival", "events", "other",
]);

const normalizeCategory = (category: unknown) => {
  const raw = typeof category === "string" ? category.toLowerCase().trim() : "other";
  const aliases: Record<string, string> = {
    contractor: "contractors",
    transport: "travel",
    transportation: "travel",
    rent: "workspace",
    utilities: "workspace",
    supplies: "equipment",
  };
  const candidate = aliases[raw] || raw || "other";
  return allowedCategories.has(candidate) ? candidate : "other";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, image_base64 } = await req.json();
    if (!image_url && !image_base64) {
      return new Response(JSON.stringify({ error: "image_url or image_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const imageContent = image_base64
      ? { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${image_base64}` } }
      : { type: "image_url" as const, image_url: { url: image_url } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a receipt/bill data extractor. Extract financial details from images of receipts, bills, invoices, or screenshots of transactions. Be precise with amounts and dates.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all financial details from this receipt/bill image. Find the vendor name, total amount, currency, date, individual items if visible, and suggest an expense category.",
              },
              imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt",
              description: "Extract structured data from a receipt or bill image",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Brief description of the expense" },
                  vendor: { type: "string", description: "Vendor or business name" },
                  amount: { type: "number", description: "Total amount" },
                  currency: { type: "string", description: "3-letter currency code (USD, EUR, GBP, etc.)" },
                  date: { type: "string", description: "Date in YYYY-MM-DD format" },
                  category: {
                    type: "string",
                    enum: ["software", "equipment", "travel", "workspace", "marketing", "education", "subscriptions", "food", "insurance", "taxes", "contractors", "entertainment", "carnival", "events", "other"],
                    description: "Expense category",
                  },
                  tax_deductible: { type: "boolean", description: "Whether this is likely a business/tax deductible expense" },
                  line_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        amount: { type: "number" },
                      },
                      required: ["description", "amount"],
                    },
                    description: "Individual line items if visible",
                  },
                  notes: { type: "string", description: "Any additional relevant info from the receipt" },
                },
                required: ["title", "amount", "currency", "category"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      parsed.category = normalizeCategory(parsed.category);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Could not extract data from image" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
