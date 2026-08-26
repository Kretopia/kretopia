import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Flag, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { moodGradient } from "@/components/project/studio/moodGradient";
import { TodaySectionShell } from "./TodaySectionShell";

interface ProjectRow {
  id: string;
  title: string;
  status: string | null;
  mood?: string | null;
  workspace_type?: string | null;
}
interface Milestone {
  title: string;
  projectTitle: string;
  dueDate: string;
}
interface RawMilestoneRow {
  title: string;
  due_date: string;
  projects: { title: string } | null;
}

/**
 * MOMENTUM — what's actually moving, not decoration. Real completed-task
 * count this week, real active projects, real next milestone. No fabricated
 * streaks: if there's nothing genuine to show for continuity, it's left out
 * rather than invented.
 */
export function Momentum() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [completedThisWeek, setCompletedThisWeek] = useState(0);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      const [completedRes, projectsRes, milestoneRes] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("id", { count: "exact", head: true })
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .eq("status", "done")
          .gte("updated_at", weekAgo.toISOString())
          .then((r) => r.count ?? 0, () => 0),
        supabase
          .from("projects")
          .select("id, title, status, mood, workspace_type")
          .neq("status", "completed")
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(3)
          .then((r) => r.data ?? [], () => []),
        supabase
          .from("project_tasks")
          .select("title, due_date, projects(title)")
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
          .neq("status", "done")
          .not("due_date", "is", null)
          .gt("due_date", today)
          .order("due_date", { ascending: true })
          .limit(1)
          .then((r) => (r.data?.[0] as unknown as RawMilestoneRow) ?? null, () => null),
      ]);

      if (cancelled) return;
      setCompletedThisWeek(completedRes);
      setProjects(projectsRes as ProjectRow[]);
      setNextMilestone(
        milestoneRes
          ? { title: milestoneRes.title, projectTitle: milestoneRes.projects?.title ?? "Untitled project", dueDate: milestoneRes.due_date }
          : null,
      );
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || !loaded) return null;
  if (completedThisWeek === 0 && projects.length === 0 && !nextMilestone) return null;

  return (
    <TodaySectionShell icon={<TrendingUp className="h-4 w-4" />} eyebrow="Progress" title="Momentum" seeAllTo="/desk">
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="rounded-2xl border border-border bg-background/60 px-3.5 py-3">
          <p className="text-2xl font-black leading-none">{completedThisWeek}</p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> done this week
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 px-3.5 py-3">
          <p className="text-2xl font-black leading-none">{projects.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Projects moving forward</p>
        </div>
      </div>

      {nextMilestone && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.03] px-3.5 py-2.5 mb-4">
          <Flag className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{nextMilestone.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {nextMilestone.projectTitle} · {new Date(nextMilestone.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="flex sm:grid sm:grid-cols-3 gap-2.5 overflow-x-auto sm:overflow-visible -mx-1 px-1 pb-1 scrollbar-hide snap-x snap-mandatory">
          {projects.map((p) => {
            const grad = moodGradient ? moodGradient(p.mood || p.workspace_type || "general") : null;
            return (
              <motion.button
                key={p.id}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/desk/${p.id}`)}
                className="group relative shrink-0 w-[200px] sm:w-auto snap-start rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-all overflow-hidden text-left"
              >
                <div className="h-12 w-full" style={{ background: grad || "hsl(var(--color-accent) / 0.14)" }} />
                <div className="p-3">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{p.status || "active"}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </TodaySectionShell>
  );
}

export default Momentum;
