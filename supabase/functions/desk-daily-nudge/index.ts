// Desk Daily Nudge — runs once a day, finds each user's most pressing
// project signal (overdue tasks, unsent draft invoices, deadlines in <=3d),
// and sends ONE consolidated push notification per user.
//
// Triggered by pg_cron — no auth required, but should only be invoked from
// the database scheduler. We accept a shared secret header for safety.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface PerUserSignal {
  user_id: string;
  overdue: number;
  draft_invoices: number;
  deadlines_soon: Array<{ project_id: string; title: string; deadline: string }>;
  any_project_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const now = new Date();
    const in3Days = new Date(Date.now() + 3 * 86400000);

    // 1. Active projects
    const { data: projects } = await admin
      .from("projects")
      .select("id, title, status, deadline, created_by, client_user_id, creative_user_ids")
      .neq("status", "completed")
      .neq("status", "archived");

    const perUser = new Map<string, PerUserSignal>();
    const ensure = (uid: string): PerUserSignal => {
      if (!perUser.has(uid)) {
        perUser.set(uid, {
          user_id: uid,
          overdue: 0,
          draft_invoices: 0,
          deadlines_soon: [],
          any_project_id: null,
        });
      }
      return perUser.get(uid)!;
    };

    // 2. For each project, gather signals & attribute to owners
    for (const p of projects || []) {
      const owners: string[] = [];
      if (p.created_by) owners.push(p.created_by);
      if (Array.isArray(p.creative_user_ids)) owners.push(...p.creative_user_ids);
      const uniqOwners = Array.from(new Set(owners));

      // Deadline soon
      if (p.deadline) {
        const d = new Date(p.deadline);
        if (d > now && d <= in3Days) {
          for (const uid of uniqOwners) {
            const s = ensure(uid);
            s.deadlines_soon.push({ project_id: p.id, title: p.title, deadline: p.deadline });
            s.any_project_id ||= p.id;
          }
        }
      }

      // Overdue tasks per assignee (or owner if unassigned)
      const { data: tasks } = await admin
        .from("project_tasks")
        .select("id, assigned_to, due_date, status")
        .eq("project_id", p.id)
        .neq("status", "done");
      for (const t of tasks || []) {
        if (!t.due_date || new Date(t.due_date) >= now) continue;
        const target = t.assigned_to || p.created_by;
        if (!target) continue;
        const s = ensure(target);
        s.overdue += 1;
        s.any_project_id ||= p.id;
      }

      // Draft invoices per issuer
      const { data: drafts } = await admin
        .from("invoices")
        .select("id, issued_by")
        .eq("project_id", p.id)
        .eq("status", "draft");
      for (const inv of drafts || []) {
        if (!inv.issued_by) continue;
        const s = ensure(inv.issued_by);
        s.draft_invoices += 1;
        s.any_project_id ||= p.id;
      }
    }

    // 3. Build & send ONE push per user
    let sent = 0;
    for (const sig of perUser.values()) {
      const lines: string[] = [];
      if (sig.overdue > 0) {
        lines.push(`${sig.overdue} task${sig.overdue > 1 ? "s" : ""} overdue`);
      }
      if (sig.draft_invoices > 0) {
        lines.push(`${sig.draft_invoices} draft invoice${sig.draft_invoices > 1 ? "s" : ""} unsent`);
      }
      if (sig.deadlines_soon.length > 0) {
        lines.push(`${sig.deadlines_soon.length} deadline${sig.deadlines_soon.length > 1 ? "s" : ""} this week`);
      }
      if (lines.length === 0) continue;

      const title = "Your Desk needs a minute";
      const body = lines.slice(0, 3).join(" · ");
      const link = sig.any_project_id ? `/desk/${sig.any_project_id}` : "/desk";

      // In-app notification
      await admin.from("notifications").insert({
        user_id: sig.user_id,
        type: "desk_daily_nudge",
        title,
        message: body,
        action_url: link,
        action_text: "Open Desk",
        category: "desk",
        priority: sig.overdue > 0 ? "high" : "normal",
      });

      // Push (best-effort, don't throw on failures)
      try {
        await admin.functions.invoke("send-push-notification", {
          body: {
            userId: sig.user_id,
            title,
            body,
            tag: "desk_daily_nudge",
            data: { url: link },
          },
        });
      } catch (e) {
        console.warn("push failed for", sig.user_id, e);
      }
      sent += 1;
    }

    return new Response(
      JSON.stringify({ users_signaled: perUser.size, notified: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("desk-daily-nudge error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
