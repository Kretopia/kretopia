import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FolderKanban, CheckCircle2, MessageSquare, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { moodGradient } from "@/components/project/studio/moodGradient";

interface Stats {
  dueToday: number;
  overdue: number;
  unreadMessages: number;
  pendingInvoiceAmount: number;
}

interface ProjectRow {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  cover_color?: string | null;
  workspace_type?: string | null;
}

/**
 * MorningPulse — the calm, operational hero of /
 *
 * Stack: one-line Morning Brief → Today chips (next-step glance) → Active Studios (top 3).
 * Pulls real data; degrades gracefully when empty (returns null so Home stays clean).
 */
export const MorningPulse = ({ firstName, greeting }: { firstName: string; greeting: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    dueToday: 0,
    overdue: 0,
    unreadMessages: 0,
    pendingInvoiceAmount: 0,
  });
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const today = new Date();
      const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      const safe = async <T,>(p: any, fallback: T): Promise<T> => {
        try {
          const r = await p;
          return (r?.data ?? fallback) as T;
        } catch {
          return fallback;
        }
      };

      const [tasks, unreadCount, invoices, projectsData] = await Promise.all([
        safe<any[]>(
          (supabase.from("project_tasks") as any)
            .select("id, due_date, status")
            .eq("assignee_id", user.id)
            .neq("status", "done")
            .lte("due_date", dayEnd),
          [],
        ),
        safe<number>(supabase.rpc("get_unread_message_count" as any), 0),
        safe<any[]>(
          (supabase.from("invoices") as any)
            .select("total_amount, status")
            .eq("user_id", user.id)
            .in("status", ["sent", "overdue"]),
          [],
        ),
        safe<any[]>(
          (supabase.from("projects") as any)
            .select("id, title, status, updated_at, cover_color, workspace_type")
            .neq("status", "completed")
            .neq("status", "archived")
            .order("updated_at", { ascending: false })
            .limit(3),
          [],
        ),
      ]);

      if (cancelled) return;

      const dueToday = tasks.filter(
        (t: any) => t.due_date && t.due_date.slice(0, 10) === dayStart.slice(0, 10),
      ).length;
      const overdue = tasks.filter((t: any) => t.due_date && t.due_date < dayStart).length;
      const unreadMessages = Number(unreadCount) || 0;
      const pendingInvoiceAmount = invoices.reduce(
        (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
        0,
      );

      setStats({ dueToday, overdue, unreadMessages, pendingInvoiceAmount });
      setProjects(projectsData as ProjectRow[]);
      setLoaded(true);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!loaded) return null;

  const briefLines: string[] = [];
  if (stats.overdue > 0) briefLines.push(`${stats.overdue} overdue`);
  if (stats.dueToday > 0) briefLines.push(`${stats.dueToday} due today`);
  if (stats.unreadMessages > 0)
    briefLines.push(`${stats.unreadMessages} unread message${stats.unreadMessages === 1 ? "" : "s"}`);
  if (stats.pendingInvoiceAmount > 0)
    briefLines.push(`$${Math.round(stats.pendingInvoiceAmount).toLocaleString()} pending`);

  const brief =
    briefLines.length === 0
      ? projects.length > 0
        ? `Calm morning. ${projects.length} active studio${projects.length === 1 ? "" : "s"} waiting when you are.`
        : "All quiet. A good moment to start something."
      : `Heads up — ${briefLines.join(" · ")}.`;

  // If nothing meaningful, render nothing (keeps Home calm for true new users)
  if (briefLines.length === 0 && projects.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      {/* Morning Brief — one calm line */}
      <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--signal-teal))] mb-1">
          {greeting}, {firstName}
        </p>
        <p className="text-sm sm:text-[15px] text-foreground leading-snug">{brief}</p>

        {/* Today chips — only render the ones that matter */}
        {(stats.overdue + stats.dueToday + stats.unreadMessages > 0 || stats.pendingInvoiceAmount > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {stats.overdue > 0 && (
              <button
                onClick={() => navigate("/desk")}
                className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-[11px] font-semibold hover:bg-destructive/15 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" /> {stats.overdue} overdue
              </button>
            )}
            {stats.dueToday > 0 && (
              <button
                onClick={() => navigate("/desk")}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold hover:bg-primary/15 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" /> {stats.dueToday} today
              </button>
            )}
            {stats.unreadMessages > 0 && (
              <button
                onClick={() => navigate("/messages")}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent-foreground px-2.5 py-1 text-[11px] font-semibold hover:bg-accent/20 transition-colors"
              >
                <MessageSquare className="h-3 w-3" /> {stats.unreadMessages}
              </button>
            )}
            {stats.pendingInvoiceAmount > 0 && (
              <button
                onClick={() => navigate("/pay")}
                className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-[11px] font-semibold hover:bg-success/15 transition-colors"
              >
                <DollarSign className="h-3 w-3" /> ${Math.round(stats.pendingInvoiceAmount).toLocaleString()}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Studios — top 3 */}
      {projects.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[hsl(var(--signal-teal))]" />
              Active Studios
            </h2>
            <Link
              to="/desk"
              className="text-xs text-[hsl(var(--signal-teal))] font-medium flex items-center gap-1 hover:underline"
            >
              All studios <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex sm:grid sm:grid-cols-3 gap-2.5 overflow-x-auto sm:overflow-visible -mx-1 px-1 pb-1 scrollbar-hide snap-x snap-mandatory">
            {projects.map((p) => {
              const grad = moodGradient ? moodGradient(p.cover_color || p.workspace_type || "general") : null;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/desk/${p.id}`)}
                  className="group relative shrink-0 w-[220px] sm:w-auto snap-start rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all overflow-hidden text-left"
                >
                  <div
                    className="h-14 w-full"
                    style={{
                      background:
                        grad ||
                        "linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--accent) / 0.12))",
                    }}
                  />
                  <div className="p-3">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                      {p.status || "active"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.section>
  );
};
