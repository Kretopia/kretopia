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

    const { messages, currency, document_type, existing_items, current_details, project_context } = await req.json();

    const docLabel = document_type === "quote" ? "quote" : "invoice";

    // Build a compact, structured snapshot of the live Studio so the AI can
    // pre-fill the quote with what the user has already captured.
    let projectBlock = "";
    if (project_context && (project_context.project || project_context.notes?.length || project_context.deliverables?.length || project_context.files?.length)) {
      const p = project_context.project || {};
      const notes = (project_context.notes || []).slice(0, 10);
      const delivs = (project_context.deliverables || []).slice(0, 20);
      const files = (project_context.files || []).slice(0, 20);
      const client = project_context.client || {};

      projectBlock = `\n\n=== LIVE PROJECT CONTEXT (Studio) ===
Use this as the source of truth. Pull line items from the deliverables and notes whenever possible — DO NOT ask the user to re-type details that are already here. Reference specific items by name.

Project: ${p.title || "Untitled"}${p.workspace_type ? ` (${p.workspace_type})` : ""}
${p.description ? `Brief: ${p.description}` : ""}
${p.budget ? `Budget: ${p.budget}` : ""}
${p.deadline ? `Deadline: ${p.deadline}` : ""}
${p.currency ? `Project currency: ${p.currency}` : ""}
${client.name || p.client_name ? `Client: ${client.name || p.client_name}${client.company ? ` (${client.company})` : ""}` : ""}
${client.email ? `Client email: ${client.email}` : ""}
${client.address ? `Client address: ${client.address}` : ""}

${delivs.length ? `Deliverables (${delivs.length}):\n${delivs.map((d: any, i: number) => `  ${i + 1}. ${d.title}${d.kind ? ` [${d.kind}]` : ""}${d.status ? ` — ${d.status}` : ""}${d.description ? ` :: ${String(d.description).slice(0, 200)}` : ""}`).join("\n")}` : ""}

${notes.length ? `Notes from the Pad (${notes.length}):\n${notes.map((n: any, i: number) => `  ${i + 1}. ${n.title}${n.content ? `: ${String(n.content).slice(0, 400)}` : ""}`).join("\n")}` : ""}

${files.length ? `Files in Vault (${files.length}): ${files.map((f: any) => f.file_name).join(", ")}` : ""}
=== END PROJECT CONTEXT ===`;
    }

    const systemPrompt = `You are ThriveQuote — an expert pricing co-pilot for creative freelancers and agencies. You help users build professional quotes and invoices through natural conversation.

Your capabilities:
1. **Cost Analysis**: When a user shares supplier/subcontractor costs, calculate appropriate markups based on industry standards
2. **Line Item Generation**: Break down vague project descriptions into professional, detailed line items
3. **Market Pricing**: Suggest rates based on creative industry standards for the user's region
4. **Description Enhancement**: Improve service descriptions to sound more professional
5. **Terms & Notes**: Suggest professional terms, payment conditions, and notes
6. **Client Details Collection**: Gather client name, email, address, dates, currency, tax info naturally through conversation

Document type: ${docLabel}
Currency: ${currency || "USD"}

CONVERSATION FLOW:
- If LIVE PROJECT CONTEXT is provided below, START by proposing draft line items derived from the deliverables + notes (one line per deliverable when sensible, with a sensible default rate or a clear "TBD — what's your cost?" placeholder). Then ask only for what's missing (rates, supplier costs, client email).
- If no project context, start by understanding the project/services
- Help with pricing, markups, and line items
- When discussing client details or when the user provides them, use the set_document_details tool to capture them
- Be proactive: after pricing is sorted, ask "Who is this ${docLabel} for?" to collect client info
- Format tables clearly using markdown tables with proper alignment
- Use bold headers and clean spacing in your responses

RULES:
- Always be conversational and helpful, like a pricing mentor
- When suggesting prices, show the math (cost → markup → client price) in clean markdown tables
- Consider the creative industry context (film, design, music, photography, etc.)
- Typical creative markups: 1.5x-3x for subcontractor costs, 2x-4x for equipment
- Always suggest adding a creative direction/project management fee (10-20% of total)
- When the user is ready, use the generate_line_items tool to output structured data
- When discussing currency, recommend appropriate currency based on client location
- Collect client details naturally — don't dump a form, ask conversationally

${existing_items && existing_items.length > 0 ? `\nCurrent line items on the document:\n${existing_items.map((i: any, idx: number) => `${idx + 1}. "${i.description}" — Qty: ${i.quantity}, Rate: ${currency} ${i.rate}`).join("\n")}` : ""}

${current_details ? `\nCurrently captured details:\n${JSON.stringify(current_details, null, 2)}` : ""}${projectBlock}`;

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
          {
            type: "function",
            function: {
              name: "set_document_details",
              description: "Capture client and document details when the user provides them during conversation. Call this whenever the user mentions their client name, email, address, preferred currency, tax rate, or due dates.",
              parameters: {
                type: "object",
                properties: {
                  client_name: { type: "string", description: "Client or company name" },
                  client_email: { type: "string", description: "Client email address" },
                  client_address: { type: "string", description: "Client address or location" },
                  currency: { type: "string", description: "Preferred currency code (e.g., USD, EUR, IDR)" },
                  tax_rate: { type: "number", description: "Tax rate percentage" },
                  due_date: { type: "string", description: "Due date or valid until date in YYYY-MM-DD format" },
                  notes: { type: "string", description: "Document notes" },
                },
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
