import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Receipt, FileText, PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ProactiveCardsProps {
  project: any;
  tasks: any[];
  onAction: (tab: string, intent?: string) => void;
  className?: string;
}

interface NudgeCard {
  id: string;
  tone: "warn" | "money" | "info" | "celebrate";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  ctaLabel: string;
  ctaTab: string;
  ctaIntent?: string;
}

/**
 * Proactive nudge cards injected near the top of the Studio feed.
 * Pure client-side derivation from existing project data — no edge fns.
 * Each card surfaces ONE concrete next action.
 */
export const ProactiveCards = ({
  project,
  tasks,
  invoices = [],
  onAction,
  className,
}: ProactiveCardsProps) => {
  const cards = useMemo<NudgeCard[]>(() => {
    const out: NudgeCard[] = [];
    const open = (tasks || []).filter((t) => t.status !== "done");
    const done = (tasks || []).filter((t) => t.status === "done");
    const overdue = open.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date(),
    );

    // 1. Overdue tasks
    if (overdue.length > 0) {
      out.push({
        id: "overdue",
        tone: "warn",
        icon: AlertTriangle,
        title: `${overdue.length} task${overdue.length > 1 ? "s" : ""} overdue`,
        body:
          overdue.length === 1
            ? `"${overdue[0].title}" is past due. Reschedule or mark done.`
            : "A few items slipped past their date. Tap to triage.",
        ctaLabel: "Triage now",
        ctaTab: "tasks",
      });
    }

    // 2. Missing brief
    const hasBrief =
      !!project?.description?.trim() ||
      !!project?.brief?.trim?.() ||
      !!project?.metadata?.brief;
    if (!hasBrief && open.length > 0) {
      out.push({
        id: "no-brief",
        tone: "info",
        icon: FileText,
        title: "No brief yet",
        body: "A 1-line brief helps everyone aim at the same target.",
        ctaLabel: "Write brief",
        ctaTab: "brief",
      });
    }

    // 3. Unsent invoice — project has client but no invoices
    const hasClient = !!project?.client_user_id || !!project?.client_name;
    const drafts = invoices.filter((i) => i.status === "draft");
    if (hasClient && invoices.length === 0 && done.length >= 1) {
      out.push({
        id: "no-invoice",
        tone: "money",
        icon: Receipt,
        title: "Time to bill?",
        body: "You've delivered work but no invoice exists for this project yet.",
        ctaLabel: "Send invoice",
        ctaTab: "finance",
        ctaIntent: "create_invoice",
      });
    } else if (drafts.length > 0) {
      out.push({
        id: "draft-invoice",
        tone: "money",
        icon: Receipt,
        title: `${drafts.length} draft invoice${drafts.length > 1 ? "s" : ""} waiting`,
        body: "You drafted but didn't send. One tap to review and send.",
        ctaLabel: "Review draft",
        ctaTab: "finance",
      });
    }

    // 4. Project almost complete
    const total = tasks.length;
    if (total >= 3 && open.length <= 1 && project?.status !== "completed") {
      out.push({
        id: "almost-done",
        tone: "celebrate",
        icon: PartyPopper,
        title: "You're nearly done",
        body:
          open.length === 0
            ? "All tasks complete. Wrap it up — log a credit and mark complete."
            : "Just one task left. Push through and close it out.",
        ctaLabel: "Wrap up",
        ctaTab: open.length === 0 ? "credits" : "tasks",
      });
    }

    return out.slice(0, 2); // never overwhelm — show top 2
  }, [project, tasks, invoices]);

  if (cards.length === 0) return null;

  const toneClasses: Record<NudgeCard["tone"], string> = {
    warn: "border-destructive/40 bg-destructive/5",
    money: "border-primary/40 bg-primary/5",
    info: "border-border bg-accent/30",
    celebrate: "border-primary/40 bg-gradient-to-br from-primary/10 to-transparent",
  };
  const iconBgClasses: Record<NudgeCard["tone"], string> = {
    warn: "bg-destructive/15 text-destructive",
    money: "bg-primary/15 text-primary",
    info: "bg-muted text-muted-foreground",
    celebrate: "bg-primary text-primary-foreground",
  };

  return (
    <section className={cn("px-4 pt-2 pb-1 space-y-2", className)}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className={cn(
              "rounded-xl border p-3 flex items-start gap-3 transition-all",
              toneClasses[c.tone],
            )}
          >
            <div
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                iconBgClasses[c.tone],
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">
                {c.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {c.body}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 mt-1.5 text-xs gap-1 text-foreground hover:bg-background/60"
                onClick={() => onAction(c.ctaTab, c.ctaIntent)}
              >
                {c.ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
};
