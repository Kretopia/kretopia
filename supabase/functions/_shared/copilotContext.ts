// Shared Copilot Context loader.
// One canonical snapshot used by every AI surface (Thrive Copilot chat,
// Desk agent, ThrivePay nudges, etc.) so the assistant always speaks to
// the user with the same identity + live state — no matter where they
// invoke it from.
//
// Design rules:
//  - One round-trip-ish: parallel queries with a hard timeout.
//  - Read-only. Never mutates.
//  - Always returns a usable shape; missing data degrades gracefully.
//  - Output is BOTH a structured object (for tools/JSON) and a
//    natural-language preamble (drop straight into a system prompt).

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface CopilotProject {
  id: string;
  title: string;
  status: string | null;
  pinned_stage: string | null;
}

export interface CopilotEvent {
  id: string;
  title: string;
  start_time: string | null;
  venue_name: string | null;
}

export interface CopilotContext {
  user_id: string;
  // Identity
  full_name: string | null;
  first_name: string;
  username: string | null;
  role: string | null;
  sub_roles: string[] | null;
  location: string | null;
  account_type: string | null;
  bio: string | null;
  // Live state
  active_projects: CopilotProject[];
  unpaid_invoices_count: number; // sent/viewed/overdue — money owed TO user
  unpaid_invoices_total: number;
  invoice_currency: string | null;
  draft_invoices_count: number; // unsent drafts — not owed yet, but pending action
  draft_invoices_total: number;
  draft_invoices_currency: string | null;
  upcoming_events: CopilotEvent[];
  recent_credits_count: number;
}

/** Race a promise against a timeout; returns null on timeout or error. */
async function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T | null> {
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ]);
  } catch (_) {
    return null;
  }
}

/**
 * Load the unified Copilot context for a user.
 * Uses a service-role client (bypasses RLS) — safe because we only read
 * data we already know the user owns or is a participant of.
 */
export async function loadCopilotContext(
  admin: SupabaseClient,
  userId: string,
): Promise<CopilotContext> {
  const empty: CopilotContext = {
    user_id: userId,
    full_name: null,
    first_name: "there",
    username: null,
    role: null,
    sub_roles: null,
    location: null,
    account_type: null,
    bio: null,
    active_projects: [],
    unpaid_invoices_count: 0,
    unpaid_invoices_total: 0,
    invoice_currency: null,
    draft_invoices_count: 0,
    draft_invoices_total: 0,
    draft_invoices_currency: null,
    upcoming_events: [],
    recent_credits_count: 0,
  };

  // Parallel fan-out, each capped at ~1.5s. Total worst-case stays under 2s.
  const [
    profileRes,
    projectsRes,
    invoicesRes,
    eventsRes,
    creditsRes,
  ] = await Promise.all([
    withTimeout(
      admin
        .from("profiles")
        .select("full_name, username, role, sub_roles, location, account_type, bio")
        .eq("user_id", userId)
        .maybeSingle(),
    ),
    withTimeout(
      admin
        .from("projects")
        .select("id, title, status, pinned_stage")
        .eq("status", "active")
        .or(
          `created_by.eq.${userId},client_user_id.eq.${userId},agent_user_id.eq.${userId}`,
        )
        .order("updated_at", { ascending: false })
        .limit(3),
    ),
    withTimeout(
      admin
        .from("invoices")
        .select("total_amount, currency, status")
        .eq("issued_by", userId)
        .in("status", ["sent", "overdue", "viewed", "draft"]),
    ),
    withTimeout(
      admin
        .from("creative_jams")
        .select("id, title, start_time, venue_name")
        .eq("created_by", userId)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3),
    ),
    withTimeout(
      admin
        .from("credits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ),
  ]);

  const profile = (profileRes as any)?.data ?? null;
  const projects = ((projectsRes as any)?.data as CopilotProject[] | null) ?? [];
  const invoiceRows = ((invoicesRes as any)?.data as Array<{ total_amount: number | null; currency: string | null; status: string }> | null) ?? [];
  const events = ((eventsRes as any)?.data as CopilotEvent[] | null) ?? [];
  const creditsCount = (creditsRes as any)?.count ?? 0;

  const fullName = profile?.full_name ?? null;
  const firstName = (fullName ?? "").trim().split(/\s+/)[0] || "there";

  // Total unpaid in the user's most-common invoice currency (good enough for chat)
  const currencyCounts: Record<string, number> = {};
  for (const r of invoiceRows) {
    const c = r.currency ?? "USD";
    currencyCounts[c] = (currencyCounts[c] ?? 0) + 1;
  }
  const dominantCurrency =
    Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const unpaidTotal = invoiceRows
    .filter((r) => (r.currency ?? "USD") === dominantCurrency)
    .reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0);

  return {
    ...empty,
    full_name: fullName,
    first_name: firstName,
    username: profile?.username ?? null,
    role: profile?.role ?? null,
    sub_roles: (profile?.sub_roles as string[] | null) ?? null,
    location: profile?.location ?? null,
    account_type: profile?.account_type ?? null,
    bio: profile?.bio ?? null,
    active_projects: projects,
    unpaid_invoices_count: invoiceRows.length,
    unpaid_invoices_total: unpaidTotal,
    invoice_currency: dominantCurrency,
    upcoming_events: events,
    recent_credits_count: creditsCount,
  };
}

/**
 * Render the context as a natural-language preamble suitable for a
 * system prompt. Surface-aware: omits sections that are empty so we
 * don't waste tokens.
 */
export function renderContextPreamble(
  ctx: CopilotContext,
  surface?: string,
  surfaceContext?: Record<string, unknown>,
): string {
  const parts: string[] = [];

  // ---- Identity (always present) ----
  const displayName = ctx.full_name?.trim() || ctx.username || "this creator";
  const firstName = ctx.first_name && ctx.first_name !== "there" ? ctx.first_name : null;

  parts.push(`=== USER FACTS (verified, from database) ===`);
  parts.push(`Full name: ${ctx.full_name ?? "(not set)"}`);
  if (firstName) {
    parts.push(`First name to use when addressing them: ${firstName}`);
  } else {
    parts.push(`First name: NOT SET — do NOT use a placeholder. Greet warmly without a name (e.g. "Hey —").`);
  }
  if (ctx.username) parts.push(`Username: @${ctx.username}`);
  if (ctx.role) parts.push(`Role: ${ctx.role}`);
  if (ctx.sub_roles?.length) parts.push(`Also: ${ctx.sub_roles.slice(0, 4).join(", ")}`);
  if (ctx.location) parts.push(`Location: ${ctx.location}`);
  if (ctx.account_type === "company") parts.push(`Account type: Company / brand account`);

  // ---- Live state (only include sections that have data) ----
  if (ctx.active_projects.length) {
    const list = ctx.active_projects
      .map((p) => `- "${p.title}"${p.pinned_stage ? ` (stage: ${p.pinned_stage})` : ""} [id: ${p.id}]`)
      .join("\n");
    parts.push(`Active projects (${ctx.active_projects.length}):\n${list}`);
  } else {
    parts.push(`Active projects: NONE`);
  }

  if (ctx.unpaid_invoices_count > 0) {
    parts.push(
      `Unpaid invoices: ${ctx.unpaid_invoices_count} totalling ${ctx.invoice_currency ?? "USD"} ${ctx.unpaid_invoices_total.toFixed(2)}`,
    );
  } else {
    parts.push(`Unpaid invoices: NONE`);
  }

  if (ctx.upcoming_events.length) {
    const evs = ctx.upcoming_events
      .map((e) => `- "${e.title}"${e.start_time ? ` on ${new Date(e.start_time).toLocaleDateString()}` : ""}`)
      .join("\n");
    parts.push(`Upcoming events they're hosting:\n${evs}`);
  } else {
    parts.push(`Upcoming events they're hosting: NONE`);
  }

  parts.push(`Credits added in last 30 days: ${ctx.recent_credits_count}`);

  // Surface awareness — tells the model where the user just clicked from.
  if (surface) {
    const surfaceMap: Record<string, string> = {
      desk: "ThriveDesk (project workspace)",
      pay: "ThrivePay (invoices, payments, expenses)",
      match: "Match (find collaborators)",
      gigs: "Gigs (opportunities board)",
      home: "Home feed",
      profile: "Profile / EPK editor",
      credit: "Credits (resume/IMDb-style portfolio)",
      event: "Events / Sessions",
    };
    parts.push(`Currently on surface: ${surfaceMap[surface] ?? surface}.`);
    if (surfaceContext && Object.keys(surfaceContext).length) {
      parts.push(`Surface context: ${JSON.stringify(surfaceContext).slice(0, 400)}.`);
    }
  }

  parts.push(`=== END USER FACTS ===`);
  parts.push(
    `CRITICAL: Treat the facts above as the ONLY ground truth about this user's activity. ` +
    `Do NOT invent projects, applications, payments, amounts, dates, collaborators, or events that are not listed above. ` +
    `If a section says NONE, do not pretend otherwise. ` +
    `If the user asks "catch me up" or "what's new" and there's nothing new in the facts, say so honestly ` +
    `(e.g. "Nothing new since you were last here — want me to suggest a next move?").`,
  );

  return parts.join("\n");
}

/**
 * Helper: get-or-create the user's canonical "Thrive Copilot" thread,
 * so cross-surface chat is one continuous conversation.
 * The thread is identified by title = '__copilot__' (hidden marker).
 */
export async function getOrCreateCopilotThread(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: existing } = await admin
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("title", "__copilot__")
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await admin
    .from("ai_conversations")
    .insert({ user_id: userId, title: "__copilot__" })
    .select("id")
    .single();
  if (error || !created) throw new Error("Could not create copilot thread");
  return created.id;
}
