import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2, Compass, DollarSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeIntents, type PrimaryIntent } from "@/lib/intents";

interface CardData {
  key: "next" | "opportunity" | "money";
  title: string;
  value: string;
  detail: string;
  cta: string;
  to: string;
  tone: "primary" | "energy" | "money";
  icon: React.ElementType;
}

/**
 * Today = Home, ≤3 cards.
 * Collapses the day into three glanceable tiles:
 *   1. Next Move      — top thing waiting on you (approvals or overdue task)
 *   2. Opportunity    — top scouted gig of the day
 *   3. Money Signal   — invoices to collect / paid this month
 *
 * Each card routes to its full surface; the original sections still live
 * inside the "More from today" details on Home.
 */
export function TodayThreeCards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [topGig, setTopGig] = useState<{ id: string; title: string; company: string | null } | null>(null);
  const [owedToYou, setOwedToYou] = useState(0);
  const [overdueInv, setOverdueInv] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const sb: any = supabase;

    const approvalsP = sb
      .from("agent_proposals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .then((r: any) => r.count ?? 0, () => 0);

    const tasksP = sb
      .from("project_tasks")
      .select("id", { count: "exact", head: true })
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .neq("status", "done")
      .lt("due_date", today)
      .then((r: any) => r.count ?? 0, () => 0);

    const gigP = sb
      .from("scouted_gigs")
      .select("id, title, company, fit_score")
      .eq("user_id", user.id)
      .order("fit_score", { ascending: false })
      .limit(1)
      .then((r: any) => (r.data?.[0] ?? null), () => null);

    const invP = sb
      .from("invoices")
      .select("total_amount, amount, status, due_date")
      .eq("issued_by", user.id)
      .then((r: any) => r.data ?? [], () => []);

    Promise.all([approvalsP, tasksP, gigP, invP]).then(([a, t, g, inv]) => {
      if (cancelled) return;
      setApprovals(a);
      setOverdueTasks(t);
      setTopGig(g);
      const now = new Date();
      let owed = 0;
      let overdue = 0;
      (inv as any[]).forEach((i: any) => {
        if (i.status !== "paid" && i.status !== "cancelled") {
          owed += Number(i.total_amount || i.amount || 0);
          if (i.due_date && new Date(i.due_date) < now) overdue += 1;
        }
      });
      setOwedToYou(owed);
      setOverdueInv(overdue);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  const nextMoveCount = approvals + overdueTasks;
  const cards: CardData[] = [
    {
      title: "Next Move",
      icon: nextMoveCount > 0 ? Sparkles : CheckCircle2,
      tone: nextMoveCount > 0 ? "primary" : "energy",
      value: nextMoveCount > 0 ? `${nextMoveCount}` : "Clear",
      detail:
        approvals > 0 && overdueTasks > 0
          ? `${approvals} to approve · ${overdueTasks} task${overdueTasks > 1 ? "s" : ""} late`
          : approvals > 0
            ? `${approvals} pending approval${approvals > 1 ? "s" : ""}`
            : overdueTasks > 0
              ? `${overdueTasks} task${overdueTasks > 1 ? "s" : ""} overdue`
              : "Nothing waiting on you",
      cta: nextMoveCount > 0 ? "Review" : "Plan today",
      to: approvals > 0 ? "/inbox" : "/desk",
    },
    {
      title: "Opportunity",
      icon: Compass,
      tone: "energy",
      value: topGig ? "1 fresh" : "Scouting",
      detail: topGig
        ? `${topGig.title}${topGig.company ? ` · ${topGig.company}` : ""}`
        : "Scout is searching the web for you",
      cta: topGig ? "Open" : "See scout",
      to: "/scout",
    },
    {
      title: "Money Signal",
      icon: DollarSign,
      tone: "money",
      value: owedToYou > 0 ? `$${Math.round(owedToYou).toLocaleString()}` : "All paid",
      detail:
        owedToYou > 0
          ? overdueInv > 0
            ? `To collect · ${overdueInv} overdue`
            : "To collect this cycle"
          : "No outstanding invoices",
      cta: owedToYou > 0 ? "Collect" : "Open Pay",
      to: "/thrivepay",
    },
  ];

  const toneClass = (tone: CardData["tone"]) => {
    switch (tone) {
      case "primary":
        return "border-primary/40 bg-primary/[0.04]";
      case "money":
        return "border-emerald-500/30 bg-emerald-500/[0.04]";
      default:
        return "border-border bg-card";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.title}
            type="button"
            onClick={() => navigate(c.to)}
            className={cn(
              "group text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]",
              toneClass(c.tone),
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border">
                <Icon className="h-4 w-4 text-foreground" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {c.title}
              </span>
            </div>
            <p className="text-2xl font-black leading-tight tracking-tight">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">{c.detail}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-foreground/80 group-hover:text-foreground">
              {c.cta} <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TodayThreeCards;
