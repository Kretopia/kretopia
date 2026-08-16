// surface-agent-watch
// Generic, deterministic proactive-nudge generator for non-Studio surfaces:
// home, scout, pay, passport. Reads cross-surface signals (profile, invoices,
// scouted gigs, collaborators, credits) and writes 0–2 agent_proposals rows
// scoped by `surface` so the client can render them as SurfaceProactiveCards.
//
// Throttle: 1 run / user / surface / 60 min.
// Auth: end-user JWT (Bearer).
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Surface = "home" | "scout" | "pay" | "passport";

interface Proposal {
  kind: string;
  title: string;
  body: string;
  action_intent: Record<string, unknown>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const surface = String(body?.surface ?? "") as Surface;
    if (!["home", "scout", "pay", "passport"].includes(surface)) {
      return json({ error: "invalid surface" }, 400);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const user = userData.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Throttle per user+surface: 60 min
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("agent_proposals")
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("surface", surface)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      return json({ ok: true, throttled: true, proposals: [] });
    }

    // Pending kinds for this surface — don't duplicate
    const { data: pending } = await admin
      .from("agent_proposals")
      .select("kind")
      .eq("owner_user_id", user.id)
      .eq("surface", surface)
      .eq("status", "pending");
    const pendingKinds = new Set((pending ?? []).map((p) => p.kind));

    const proposals: Proposal[] = [];

    // ===== shared signals =====
    const { data: profile } = await admin
      .from("profiles")
      .select(
        "user_id, full_name, bio, site_headline, avatar_url, day_rate, verification_score, primary_role",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const profileStrength = computeStrength(profile);

    // ===== surface-specific rules =====
    if (surface === "home" || surface === "passport") {
      if (profileStrength < 60 && !pendingKinds.has("passport_polish")) {
        proposals.push({
          kind: "passport_polish",
          title: "Your Passport is at " + profileStrength + "%",
          body:
            "A complete Passport gets ~3× more views from brands & scouts. Spend 2 minutes filling the gaps.",
          action_intent: {
            href: "/profile?edit=1",
            cta: "Polish Passport",
            score: profileStrength,
          },
        });
      }
    }

    if (surface === "home" || surface === "scout") {
      // Fresh scouted gigs not yet opened
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: fresh } = await admin
        .from("scouted_gigs")
        .select("id, title, source, created_at")
        .eq("user_id", user.id)
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      if ((fresh?.length ?? 0) > 0 && !pendingKinds.has("gig_match")) {
        const top = fresh![0];
        proposals.push({
          kind: "gig_match",
          title:
            (fresh!.length === 1
              ? "1 fresh gig matched you"
              : fresh!.length + " fresh gigs matched you") +
            " in the last 24h",
          body: `Top pick: "${(top.title ?? "Untitled").slice(0, 90)}". Review and let Thrive draft your reply.`,
          action_intent: { href: "/scout?tab=scouted", cta: "Open Scout" },
        });
      }
    }

    if (surface === "scout" || surface === "passport") {
      if (!profile?.day_rate && !pendingKinds.has("rate_optimize")) {
        proposals.push({
          kind: "rate_optimize",
          title: "Set your day rate",
          body:
            "Without a rate Thrive can't auto-draft quotes or shortlist gigs at your level. Takes 30 seconds.",
          action_intent: { href: "/profile?edit=1#rate", cta: "Set rate" },
        });
      }
    }

    if (surface === "home" || surface === "pay") {
      // Overdue invoices
      const today = new Date().toISOString().slice(0, 10);
      const { data: overdue } = await admin
        .from("invoices")
        .select("id, invoice_number, amount, currency, due_date")
        .eq("issued_by", user.id)
        .in("status", ["pending", "sent", "overdue"])
        .is("paid_at", null)
        .lt("due_date", today)
        .order("due_date", { ascending: true })
        .limit(5);

      if ((overdue?.length ?? 0) > 0 && !pendingKinds.has("pay_cashflow")) {
        const count = overdue!.length;
        const totalAmt = overdue!.reduce((s, i) => s + Number(i.amount ?? 0), 0);
        const cur = overdue![0].currency ?? "USD";
        proposals.push({
          kind: "pay_cashflow",
          title:
            count === 1
              ? `Invoice #${overdue![0].invoice_number} is overdue`
              : `${count} invoices overdue (${cur} ${totalAmt.toLocaleString()})`,
          body:
            "Let Thrive draft a warm chase email so cash keeps moving without the awkward.",
          action_intent: {
            href: "/thrivepay?tab=invoices&filter=overdue",
            cta: "Open Pay",
            count,
            total: totalAmt,
            currency: cur,
          },
        });
      }
    }

    if (surface === "home" || surface === "passport") {
      // Frequent collaborators (≥2 shared credits, not yet connected)
      const { data: credits } = await admin
        .from("credits")
        .select("collaborator_user_ids")
        .eq("user_id", user.id)
        .limit(50);

      const collabCounts = new Map<string, number>();
      for (const c of credits ?? []) {
        const list: any[] = Array.isArray(c.collaborator_user_ids)
          ? c.collaborator_user_ids
          : [];
        for (const x of list) {
          const id = typeof x === "string" ? x : x?.user_id ?? x?.id;
          if (id && id !== user.id) {
            collabCounts.set(id, (collabCounts.get(id) ?? 0) + 1);
          }
        }
      }

      const freq = [...collabCounts.entries()]
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1);

      if (freq.length > 0 && !pendingKinds.has("frequent_collaborator")) {
        const [collabId, count] = freq[0];
        const { data: connected } = await admin
          .from("connections")
          .select("id")
          .eq("status", "accepted")
          .or(`and(user_id.eq.${user.id},connected_user_id.eq.${collabId}),and(user_id.eq.${collabId},connected_user_id.eq.${user.id})`)
          .limit(1);
        if (!connected || connected.length === 0) {
          const { data: cp } = await admin
            .from("profiles")
            .select("full_name")
            .eq("user_id", collabId)
            .maybeSingle();
          const name = cp?.full_name ?? "your frequent collaborator";
          proposals.push({
            kind: "frequent_collaborator",
            title: `You've shipped ${count} credits with ${name}`,
            body:
              "Lock it in as a connection so they show up in your Rolodex and you can co-sign each other.",
            action_intent: {
              href: `/profile/${collabId}`,
              cta: "Open profile",
              target_user_id: collabId,
            },
          });
        }
      }
    }

    // Cap to top 2
    const finalProps = proposals.slice(0, 2);
    if (finalProps.length === 0) return json({ ok: true, proposals: [] });

    const rows = finalProps.map((p) => ({
      project_id: null,
      surface,
      owner_user_id: user.id,
      kind: p.kind,
      title: p.title.slice(0, 80),
      body: p.body.slice(0, 240),
      action_intent: p.action_intent,
      source_signal: { generated_at: new Date().toISOString(), surface },
    }));

    const { data: inserted, error: insErr } = await admin
      .from("agent_proposals")
      .insert(rows)
      .select("id, kind, title, body, action_intent, status, created_at");

    if (insErr) {
      console.error("surface-agent-watch insert error", insErr);
      return json({ error: "insert_failed", detail: insErr.message }, 500);
    }

    return json({ ok: true, proposals: inserted });
  } catch (e) {
    console.error("surface-agent-watch error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function computeStrength(p: any): number {
  if (!p) return 0;
  let score = 0;
  if (p.full_name) score += 15;
  if (p.avatar_url) score += 15;
  if (p.site_headline) score += 15;
  if (p.bio && String(p.bio).length > 40) score += 15;
  if (p.primary_role) score += 15;
  if (p.day_rate) score += 15;
  if ((p.verification_score ?? 0) > 0) score += 10;
  return Math.min(100, score);
}
