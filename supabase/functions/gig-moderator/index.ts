// AI Gig Moderator
// Scans active gigs and:
//   1. Closes ones whose deadline has passed (parsed from description/duration via Gemini)
//   2. Closes stale gigs (>90 days old, 0 applications, 0 recent views)
//   3. Flags spam/scam with AI moderation (logged for admin review)
// Runs on a daily cron and is also callable manually.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STALE_DAYS = 90;
const BATCH_SIZE = 50;

type Gig = {
  id: string;
  title: string;
  description: string;
  duration: string | null;
  created_at: string;
  status: string;
  type: string;
  barter_posting_deadline: string | null;
};

async function aiAnalyzeGig(g: Gig): Promise<{
  detected_deadline: string | null;
  expired: boolean;
  is_spam: boolean;
  reason: string;
  confidence: number;
}> {
  if (!LOVABLE_API_KEY) {
    return { detected_deadline: null, expired: false, is_spam: false, reason: "no AI key", confidence: 0 };
  }
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. Analyze this gig posting and return ONLY JSON:
{
  "detected_deadline": "YYYY-MM-DD or null",
  "expired": boolean (true if deadline has passed),
  "is_spam": boolean (scam, MLM, adult, illegal, obvious nonsense),
  "reason": "short explanation",
  "confidence": number 0..1
}

Title: ${g.title}
Type: ${g.type}
Duration: ${g.duration ?? "—"}
Description: ${g.description.slice(0, 1500)}`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a strict content moderator. Output JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      console.warn("AI call failed", r.status);
      return { detected_deadline: null, expired: false, is_spam: false, reason: "ai_error", confidence: 0 };
    }
    const data = await r.json();
    const txt = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(txt);
    return {
      detected_deadline: parsed.detected_deadline || null,
      expired: !!parsed.expired,
      is_spam: !!parsed.is_spam,
      reason: String(parsed.reason || "").slice(0, 300),
      confidence: Number(parsed.confidence) || 0,
    };
  } catch (e) {
    console.warn("AI parse error", e);
    return { detected_deadline: null, expired: false, is_spam: false, reason: "parse_error", confidence: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const startedAt = Date.now();

  let dryRun = false;
  let limit = BATCH_SIZE;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      dryRun = !!body?.dryRun;
      if (typeof body?.limit === "number") limit = Math.min(200, Math.max(1, body.limit));
    }
  } catch (_) { /* ignore */ }

  const { data: gigs, error } = await supa
    .from("opportunities")
    .select("id,title,description,duration,created_at,status,type,barter_posting_deadline")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = new Date();
  const staleCutoff = new Date(today.getTime() - STALE_DAYS * 86400000);
  const summary = { scanned: 0, closed_expired: 0, closed_stale: 0, flagged_spam: 0, kept: 0 };
  const actions: any[] = [];

  for (const g of (gigs ?? []) as Gig[]) {
    summary.scanned++;
    let action: string | null = null;
    let reason = "";
    let confidence = 0;
    let detectedDeadline: string | null = null;

    if (g.barter_posting_deadline) {
      const d = new Date(g.barter_posting_deadline);
      if (!isNaN(d.getTime()) && d < today) {
        action = "closed_expired";
        reason = `Barter posting deadline (${g.barter_posting_deadline}) has passed.`;
        confidence = 1;
        detectedDeadline = g.barter_posting_deadline;
      }
    }

    if (!action) {
      const ai = await aiAnalyzeGig(g);
      detectedDeadline = ai.detected_deadline;
      if (ai.expired && ai.confidence >= 0.6) {
        action = "closed_expired";
        reason = ai.reason || "Deadline has passed (AI).";
        confidence = ai.confidence;
      } else if (ai.is_spam && ai.confidence >= 0.7) {
        action = "flagged_spam";
        reason = ai.reason || "Flagged as spam/scam by AI.";
        confidence = ai.confidence;
      }
    }

    if (!action && new Date(g.created_at) < staleCutoff) {
      const { count: appCount } = await supa
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("opportunity_id", g.id);
      if ((appCount ?? 0) === 0) {
        action = "closed_stale";
        reason = `No applications in ${STALE_DAYS}+ days.`;
        confidence = 0.9;
      }
    }

    if (!action) {
      summary.kept++;
      continue;
    }

    if (!dryRun) {
      if (action === "closed_expired" || action === "closed_stale") {
        await supa.from("opportunities").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", g.id);
      }
      await supa.from("gig_moderation_log").insert({
        opportunity_id: g.id,
        action,
        reason,
        confidence,
        detected_deadline: detectedDeadline,
        metadata: { title: g.title, type: g.type },
      });
    }

    if (action === "closed_expired") summary.closed_expired++;
    else if (action === "closed_stale") summary.closed_stale++;
    else if (action === "flagged_spam") summary.flagged_spam++;

    actions.push({ id: g.id, title: g.title, action, reason, confidence });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dryRun,
      durationMs: Date.now() - startedAt,
      summary,
      actions,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
