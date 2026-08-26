import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlarmClock, ArrowRight, Check, Clock, Sparkles, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TodaySectionShell } from "./TodaySectionShell";

interface FocusTask {
  kind: "task";
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  dueDate: string | null;
  overdue: boolean;
}
interface FocusApproval {
  kind: "approval";
  id: string;
  title: string;
  body: string;
  href: string | null;
}
interface FocusGig {
  kind: "gig";
  id: string;
  title: string;
  company: string | null;
}
type Focus = FocusTask | FocusApproval | FocusGig | null;

interface RawTaskRow {
  id: string;
  title: string;
  due_date: string | null;
  project_id: string;
  projects: { title: string } | null;
}
interface RawApprovalRow {
  id: string;
  title: string;
  body: string;
  action_intent: { href?: string } | null;
}

/**
 * TODAY FOCUS — the single highest-priority action, not a tile row.
 * Priority: an overdue task > a task due today > a pending AI proposal >
 * the freshest scouted gig > a calm "all caught up" state. Whichever wins,
 * it's the one thing shown, with a completion state you can act on right
 * here instead of just a link out.
 */
export function TodayFocus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reducedMotion = useReducedMotion();
  const [focus, setFocus] = useState<Focus>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);

    const [taskRes, approvalRes, gigRes] = await Promise.all([
      supabase
        .from("project_tasks")
        .select("id, title, due_date, project_id, projects(title)")
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .neq("status", "done")
        .not("due_date", "is", null)
        .lte("due_date", today)
        .order("due_date", { ascending: true })
        .limit(1)
        .then((r) => (r.data?.[0] as unknown as RawTaskRow) ?? null, () => null),
      supabase
        .from("agent_proposals")
        .select("id, title, body, action_intent")
        .eq("owner_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .then((r) => (r.data?.[0] as unknown as RawApprovalRow) ?? null, () => null),
      supabase
        .from("scouted_gigs")
        .select("id, title, company")
        .eq("target_user_id", user.id)
        .order("fit_score", { ascending: false })
        .limit(1)
        .then((r) => r.data?.[0] ?? null, () => null),
    ]);

    if (taskRes) {
      setFocus({
        kind: "task",
        id: taskRes.id,
        title: taskRes.title,
        projectId: taskRes.project_id,
        projectTitle: taskRes.projects?.title ?? "Untitled project",
        dueDate: taskRes.due_date,
        overdue: !!taskRes.due_date && taskRes.due_date < today,
      });
    } else if (approvalRes) {
      setFocus({
        kind: "approval",
        id: approvalRes.id,
        title: approvalRes.title,
        body: approvalRes.body,
        href: typeof approvalRes.action_intent?.href === "string" ? approvalRes.action_intent.href : null,
      });
    } else if (gigRes) {
      setFocus({ kind: "gig", id: gigRes.id, title: gigRes.title, company: gigRes.company });
    } else {
      setFocus(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async () => {
    if (!focus || focus.kind !== "task") return;
    setBusy(true);
    try {
      const { error } = await supabase.from("project_tasks").update({ status: "done" }).eq("id", focus.id);
      if (error) throw error;
      setJustCompleted(true);
      toast({ title: "Marked complete", description: focus.title });
      setTimeout(() => {
        setJustCompleted(false);
        load();
      }, 900);
    } catch {
      toast({ title: "Couldn't complete that task", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSnooze = async () => {
    if (!focus || focus.kind !== "task") return;
    setBusy(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { error } = await supabase
        .from("project_tasks")
        .update({ due_date: tomorrow.toISOString().slice(0, 10) })
        .eq("id", focus.id);
      if (error) throw error;
      toast({ title: "Snoozed to tomorrow" });
      load();
    } catch {
      toast({ title: "Couldn't snooze that task", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!focus || focus.kind !== "approval") return;
    setBusy(true);
    try {
      await supabase
        .from("agent_proposals")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", focus.id);
      if (focus.href) navigate(focus.href);
      else load();
    } finally {
      setBusy(false);
    }
  };

  const handleDismissApproval = async () => {
    if (!focus || focus.kind !== "approval") return;
    setBusy(true);
    try {
      await supabase.from("agent_proposals").update({ status: "dismissed" }).eq("id", focus.id);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!user || loading) return null;

  return (
    <TodaySectionShell
      icon={<Target className="h-4 w-4" />}
      eyebrow="Right now"
      title="Today Focus"
    >
      <AnimatePresence mode="wait">
        {justCompleted ? (
          <motion.div
            key="done"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <Check className="h-4 w-4" /> Nice work — that's done.
          </motion.div>
        ) : !focus ? (
          <motion.div
            key="empty"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4"
          >
            <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">You're all caught up. A good moment to start something.</p>
          </motion.div>
        ) : focus.kind === "task" ? (
          <motion.div
            key={focus.id}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              {focus.overdue ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
                  <AlarmClock className="h-3 w-3" /> Overdue
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                  <Clock className="h-3 w-3" /> Due today
                </span>
              )}
            </div>
            <p className="text-sm font-bold leading-snug text-foreground">{focus.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{focus.projectTitle}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button size="sm" disabled={busy} onClick={handleComplete} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Complete
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={handleSnooze}>
                Snooze
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/desk/${focus.projectId}`)}
                className="gap-1"
              >
                Open Project <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ) : focus.kind === "approval" ? (
          <motion.div
            key={focus.id}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">Kreto suggests</p>
            <p className="text-sm font-bold leading-snug text-foreground">{focus.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{focus.body}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button size="sm" disabled={busy} onClick={handleAccept} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Review
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={handleDismissApproval} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Not now
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={focus.id}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-background/60 p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Fresh opportunity</p>
            <p className="text-sm font-bold leading-snug text-foreground">{focus.title}</p>
            {focus.company && <p className="text-xs text-muted-foreground mt-0.5">{focus.company}</p>}
            <Button size="sm" onClick={() => navigate("/scout")} className="gap-1.5 mt-3">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </TodaySectionShell>
  );
}

export default TodayFocus;
