import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bell, Calendar, Check, LayoutGrid, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TodaySectionShell } from "./TodaySectionShell";
import { SurfaceProactiveCards } from "@/components/agent/SurfaceProactiveCards";
import { ApprovalsHub } from "@/components/agent/ApprovalsHub";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { DailyBriefingCard } from "@/components/home/DailyBriefingCard";
import { KretoTip } from "@/components/agent/KretoTip";
import { MoneyBrief } from "@/components/thrivepay/MoneyBrief";
import { TrendingLane } from "@/components/discover/TrendingLane";
import { UpcomingSessionsCard } from "@/components/home/UpcomingSessionsCard";
import { SpeedTonightCard } from "@/components/home/SpeedTonightCard";
import { CuratedStagesRail } from "@/components/circle/CuratedStagesRail";
import { GetStartedChecklist } from "@/components/onboarding/GetStartedChecklist";
import { DuplicateAccountBanner } from "@/components/account/DuplicateAccountBanner";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { checkProfileCompletion } from "@/lib/profileCompletion";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface Deadline {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  dueDate: string;
  overdue: boolean;
}

type Filter = "all" | "approvals" | "deadlines" | "discover" | "schedule";

interface MoreFromTodayProps {
  peopleForYou?: ReactNode;
  profile?: ProfileRow | null;
  profileFull?: ProfileRow | null;
  myCredits?: number;
}

interface RawTaskRow {
  id: string;
  title: string;
  due_date: string;
  project_id: string;
  projects: { title: string } | null;
}

/**
 * MORE FROM TODAY — the page's primary content dashboard, always visible
 * (no longer hidden behind a closed <details>). Real filter chips gate the
 * genuinely multi-item sections (approvals / deadlines / discover /
 * schedule); the always-relevant single widgets (money, onboarding,
 * duplicate-account) sit below, unfiltered, exactly as they already were.
 */
export function MoreFromToday({ peopleForYou, profile, profileFull, myCredits = 0 }: MoreFromTodayProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reducedMotion = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [approvalCount, setApprovalCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [stageCount, setStageCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const weekOut = new Date();
    weekOut.setDate(weekOut.getDate() + 7);

    const [taskRes, approvalRes, unreadRes] = await Promise.all([
      supabase
        .from("project_tasks")
        .select("id, title, due_date, project_id, projects(title)")
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .neq("status", "done")
        .not("due_date", "is", null)
        .lte("due_date", weekOut.toISOString().slice(0, 10))
        .order("due_date", { ascending: true })
        .limit(6)
        .then((r) => (r.data as unknown as RawTaskRow[]) ?? [], () => [] as RawTaskRow[]),
      supabase
        .from("agent_proposals")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", user.id)
        .eq("status", "pending")
        .then((r) => r.count ?? 0, () => 0),
      supabase.rpc("get_unread_message_count" as any).then((r: { data: unknown }) => Number(r?.data) || 0, () => 0),
    ]);

    setUnreadMessages(unreadRes);
    setDeadlines(
      taskRes.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.project_id,
        projectTitle: t.projects?.title ?? "Untitled project",
        dueDate: t.due_date,
        overdue: t.due_date < today,
      })),
    );
    setApprovalCount(approvalRes);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCompleteDeadline = async (id: string) => {
    setBusyId(id);
    try {
      await supabase.from("project_tasks").update({ status: "done" }).eq("id", id);
      setDeadlines((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Marked complete" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSnoozeDeadline = async (id: string) => {
    setBusyId(id);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await supabase.from("project_tasks").update({ due_date: tomorrow.toISOString().slice(0, 10) }).eq("id", id);
      setDeadlines((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Snoozed to tomorrow" });
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  const filters: Array<{ key: Filter; label: string; count?: number }> = [
    { key: "all", label: "All" },
    { key: "approvals", label: "Approvals", count: approvalCount || undefined },
    { key: "deadlines", label: "Deadlines", count: deadlines.length || undefined },
    { key: "discover", label: "Discover" },
    { key: "schedule", label: "Schedule" },
  ];

  const show = (bucket: Filter) => filter === "all" || filter === bucket;

  return (
    <TodaySectionShell icon={<LayoutGrid className="h-4 w-4" />} eyebrow="More to do" title="What's next">
      {/* Filter chips — real, stateful, not decorative */}
      <div role="tablist" aria-label="Filter today's content" className="flex flex-wrap gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {f.label}
            {f.count ? <span className="ml-1 opacity-80">{f.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {show("approvals") && <SurfaceProactiveCards surface="home" className="px-0" limit={3} />}
        {show("approvals") && <ApprovalsHub limit={4} />}

        {show("deadlines") && deadlines.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Upcoming deadlines
            </p>
            {deadlines.map((d) => (
              <motion.div
                key={d.id}
                initial={reducedMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                  d.overdue ? "border-destructive/30 bg-destructive/[0.03]" : "border-border bg-background/60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {d.projectTitle} · {d.overdue ? "Overdue" : new Date(d.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === d.id}
                    onClick={() => handleCompleteDeadline(d.id)}
                    aria-label={`Mark ${d.title} complete`}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === d.id}
                    onClick={() => handleSnoozeDeadline(d.id)}
                    aria-label={`Snooze ${d.title}`}
                    className="h-8 w-8 p-0"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/desk/${d.projectId}`)}
                    aria-label={`Open ${d.projectTitle}`}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </section>
        )}

        {show("discover") && (
          <section className="space-y-4">
            {peopleForYou}
            <ScoutedGigsSection limit={3} />
            <TrendingLane />
          </section>
        )}

        {show("schedule") && (
          <section className="space-y-2">
            <UpcomingSessionsCard />
            {stageCount !== 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Sound Stages this week</p>
                  <Link to="/circle?tab=live" className="text-[11px] font-semibold text-primary hover:underline">See all</Link>
                </div>
                <CuratedStagesRail limit={6} hideWhenEmpty onLoad={setStageCount} />
              </div>
            )}
            <SpeedTonightCard />
          </section>
        )}

        {unreadMessages > 0 && (
          <button
            onClick={() => navigate("/messages")}
            className="w-full flex items-center gap-2.5 rounded-2xl border border-border bg-background/60 px-3.5 py-3 text-left hover:border-primary/40 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium flex-1">
              {unreadMessages} unread message{unreadMessages === 1 ? "" : "s"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}

        {/* Always-relevant, single widgets — not filtered, each already
            renders nothing when it has nothing to say. */}
        <KretoTip surface="today" />
        <DailyBriefingCard />
        <DuplicateAccountBanner />
        {profile && checkProfileCompletion(profileFull || profile, myCredits).percentage < 50 && (
          <GetStartedChecklist />
        )}
        <MoneyBrief variant="compact" />
        <PushNotificationPrompt trigger="default" />
      </div>
    </TodaySectionShell>
  );
}

export default MoreFromToday;
