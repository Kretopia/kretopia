// Thrive Executive Producer — document engine.
// Generates structured deck/proposal/treatment/rate-card JSON for a creator,
// pulling Passport (profile, credits, rates) + thrive_memory + Studio context.
// One engine, many intents.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Intent =
  | "sponsor_deck"
  | "pitch_deck"
  | "business_plan"
  | "client_proposal"
  | "treatment"
  | "rate_card"
  | "moodboard_deck"
  | "one_pager";

const INTENT_SKELETONS: Record<Intent, { slides: string[]; tone: string }> = {
  sponsor_deck: {
    tone: "Confident, partner-focused. Lead with audience value to the sponsor, not features of the event.",
    slides: ["Cover", "The Moment (why now)", "Who's in the room (audience)", "What we're building", "Sponsor tiers & activations", "Past wins (credits + co-signs)", "Team", "The ask", "Contact"],
  },
  pitch_deck: {
    tone: "Investor-grade but human. Show traction, team, opportunity.",
    slides: ["Cover", "Problem", "Solution", "How it works", "Market", "Traction", "Business model", "Why us (team + credits)", "Roadmap", "The ask", "Contact"],
  },
  business_plan: {
    tone: "Strategic, structured, numbers-forward.",
    slides: ["Executive Summary", "Vision & Mission", "Market Opportunity", "Product / Service", "Go-to-market", "Operations", "Team", "Financial Projections", "Milestones", "Funding Ask", "Appendix"],
  },
  client_proposal: {
    tone: "Warm, specific to the client. Show you understand their goal first, then sell the plan.",
    slides: ["Cover", "What you're trying to do", "Our take", "What we'll deliver", "Timeline", "Investment", "Why us (relevant credits)", "Next steps"],
  },
  treatment: {
    tone: "Cinematic, sensory, visual-first. Director's voice.",
    slides: ["Cover (logline)", "The world", "Story / arc", "Visual references", "Sound & tone", "Cast & key crew", "Schedule + locations", "Director's note"],
  },
  rate_card: {
    tone: "Clear, premium, no apologies. Anchor packages, not hourly.",
    slides: ["Cover", "How I work", "Packages", "Add-ons", "What's included / not", "Recent clients", "Contact"],
  },
  moodboard_deck: {
    tone: "Image-first. One idea per slide. Minimal text.",
    slides: ["Cover concept", "Mood 1", "Mood 2", "Mood 3", "Mood 4", "Mood 5", "Palette & type", "Closing image"],
  },
  one_pager: {
    tone: "Single dense page. Hook, value, proof, ask.",
    slides: ["One Pager"],
  },
};

const SYSTEM = (intent: Intent) => `You are Thrive — the user's Executive Producer inside ThriveIN. You're not a generic AI; you run their business.

You're drafting a ${intent.replace("_", " ")} for a creative professional.
Tone: ${INTENT_SKELETONS[intent].tone}

RULES:
- Write like a senior producer who already knows the user. Reference their real credits, co-signs, rates, past work where given.
- Never write filler like "As an AI...", "Here is your...", "I have generated...". Just deliver.
- Each slide must be specific to THIS brief, not template-y boilerplate.
- Body copy: punchy, scannable. Use short paragraphs and bulleted lists where it helps.
- Keep the user's voice. If they mention their style ("bold, no-fluff"), match it.
- If a BRAND is provided in context, treat it as law: use the brand name, tagline and voice_tone everywhere, honour the do/dont list, surface palette colours by HEX when referring to look-and-feel, and weave the brand's links into the contact slide.
- If a STUDIO BRAIN is provided (facts, entities), use those real numbers, dates, venues, sponsors, contacts and budgets directly. Never re-ask the user for something already in the brain.
- If you don't have a real fact, leave a clearly-labelled [PLACEHOLDER: ...] for the user to fill — never invent numbers, dates, or names.

Return a single tool call with the structured document.`;

async function generate(intent: Intent, ctx: Record<string, unknown>, apiKey: string) {
  const skeleton = INTENT_SKELETONS[intent];
  const userMsg = `BRIEF FROM USER:
${ctx.user_brief || "(none — infer from context)"}

CONTEXT THRIVE ALREADY KNOWS:
${JSON.stringify(ctx, null, 2)}

SLIDE SKELETON (use as a starting point, you may add/merge/reorder for this specific brief):
${skeleton.slides.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Draft the document now.`;

  const tool = {
    type: "function",
    function: {
      name: "deliver_document",
      description: "Return the finished document as structured JSON.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          cover_prompt: { type: "string", description: "Short image-gen prompt for the cover hero image." },
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                eyebrow: { type: "string" },
                body: { type: "string", description: "Markdown — paragraphs, bullets with - , bold with **." },
                bullets: { type: "array", items: { type: "string" } },
                image_prompt: { type: "string", description: "Optional. Image-gen prompt if this slide should have a hero image." },
                callout: { type: "string" },
              },
              required: ["heading", "body"],
              additionalProperties: false,
            },
          },
          next_steps: {
            type: "array",
            description: "3-5 concrete actions the user should take after sending this doc.",
            items: { type: "string" },
          },
        },
        required: ["title", "slides", "next_steps"],
        additionalProperties: false,
      },
    },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM(intent) },
        { role: "user", content: userMsg },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "deliver_document" } },
    }),
  });

  if (resp.status === 429) throw new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429 });
  if (resp.status === 402) throw new Response(JSON.stringify({ error: "Workspace AI credits exhausted." }), { status: 402 });
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error", resp.status, t);
    throw new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500 });
  }
  const data = await resp.json();
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) throw new Response(JSON.stringify({ error: "No document returned" }), { status: 500 });
  return JSON.parse(tc.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const intent = body.intent as Intent;
    const project_id = body.project_id as string | null;
    const user_brief = (body.user_brief as string) || "";
    const theme = (body.theme as string) || "editorial";
    const document_id = body.document_id as string | null; // for regen

    if (!intent || !INTENT_SKELETONS[intent]) {
      return new Response(JSON.stringify({ error: "Invalid intent" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull Passport context in parallel
    const [profileRes, creditsRes, memoryRes, projectRes, factsRes, entitiesRes, brandRes] = await Promise.all([
      admin.from("profiles").select("display_name, username, headline, bio, location, professional_role").eq("user_id", user.id).maybeSingle(),
      admin.from("credits").select("project_name, role, year, project_type, thumbnail_url").eq("user_id", user.id).order("year", { ascending: false }).limit(10),
      admin.from("thrive_memory").select("kind, mem_key, content").eq("user_id", user.id).limit(40),
      project_id ? admin.from("projects").select("title, description, workspace_type, deadline").eq("id", project_id).maybeSingle() : Promise.resolve({ data: null }),
      // STUDIO BRAIN — facts extracted from anything dropped into this Studio
      project_id ? admin.from("studio_facts").select("kind, label, value, value_numeric, value_date, importance, source_kind").eq("project_id", project_id).order("importance", { ascending: false }).limit(60) : Promise.resolve({ data: [] }),
      project_id ? admin.from("studio_entities").select("kind, name, aliases, attrs, importance").eq("project_id", project_id).order("importance", { ascending: false }).limit(40) : Promise.resolve({ data: [] }),
      // BRAND VAULT — project-attached vault wins, else the user's default
      admin.from("brand_vaults")
        .select("name, logo_url, palette, fonts, voice_tone, tagline, do_dont, links, attrs, is_default, project_id")
        .eq("user_id", user.id)
        .or(project_id ? `project_id.eq.${project_id},and(project_id.is.null,is_default.eq.true)` : `project_id.is.null,is_default.eq.true`)
        .limit(5),
    ]);

    const vaults = brandRes.data || [];
    const brand = vaults.find((v: any) => v.project_id === project_id) || vaults.find((v: any) => v.is_default) || null;

    const ctx = {
      user_brief,
      intent,
      passport: profileRes.data || {},
      recent_credits: creditsRes.data || [],
      memory: memoryRes.data || [],
      studio: projectRes.data || null,
      // The Studio Brain — pre-extracted, reusable project memory.
      // EP should rely on these instead of asking the user to re-explain.
      studio_brain: {
        facts: factsRes.data || [],
        entities: entitiesRes.data || [],
      },
      // BRAND VAULT — persistent brand identity. Apply automatically.
      brand: brand
        ? {
            name: brand.name,
            tagline: brand.tagline,
            voice_tone: brand.voice_tone,
            palette: brand.palette,
            fonts: brand.fonts,
            logo_url: brand.logo_url,
            do: brand.do_dont?.do ?? [],
            dont: brand.do_dont?.dont ?? [],
            links: brand.links,
          }
        : null,
    };

    const generated = await generate(intent, ctx, LOVABLE_API_KEY);
    // Snapshot the active brand inside the saved document so renderers
    // (editor + public share) can paint logo/palette without re-fetching.
    const doc = ctx.brand
      ? { ...generated, brand_snapshot: {
          name: ctx.brand.name,
          tagline: ctx.brand.tagline,
          logo_url: ctx.brand.logo_url,
          palette: ctx.brand.palette,
          fonts: ctx.brand.fonts,
        } }
      : generated;



    // Persist
    let saved;
    if (document_id) {
      // Save previous version first
      const { data: prev } = await admin.from("thrive_documents").select("content").eq("id", document_id).eq("user_id", user.id).maybeSingle();
      if (prev) {
        await admin.from("thrive_document_versions").insert({
          document_id, user_id: user.id, content: prev.content, change_note: "Regenerated",
        });
      }
      const { data, error } = await admin.from("thrive_documents")
        .update({ content: doc, title: doc.title, brief: user_brief, theme, model_used: "google/gemini-2.5-pro" })
        .eq("id", document_id).eq("user_id", user.id).select().single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await admin.from("thrive_documents").insert({
        user_id: user.id,
        project_id,
        intent,
        title: doc.title,
        brief: user_brief,
        content: doc,
        theme,
        status: "draft",
        model_used: "google/gemini-2.5-pro",
        credits_spent: 5,
      }).select().single();
      if (error) throw error;
      saved = data;
    }

    return new Response(JSON.stringify({ document: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) {
      const text = await e.text();
      return new Response(text, { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("thrive-document-engine error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
