import { memo } from "react";
import { Check, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROJECT_FLOW_STAGES,
  STUDIO_PHASES,
  type ProjectFlow,
  type ProjectFlowStageId,
  type StudioPhaseId,
} from "@/hooks/useProjectFlow";

interface StudioPhaseRailProps {
  flow: ProjectFlow;
  /** Jumps to the tab of the first stage inside the clicked phase. */
  onPhaseClick: (tab: string) => void;
  onPinStage?: (stageId: ProjectFlowStageId | null) => void;
  className?: string;
}

/**
 * Compact six-phase progress rail — Discuss / Define / Build / Review /
 * Commit / Complete — the Studio Room's one-page "where am I" summary.
 * Purely a grouped view over the existing 8-stage useProjectFlow() data
 * (see stageToPhase in that hook); introduces no new progression system
 * and no new stored state. Replaces the old desktop-only, 8-pill
 * ProjectFlowTimeline as the primary indicator so mobile and desktop show
 * the same thing; that detailed per-stage timeline is retired (see
 * STUDIO_ROOM_PROGRESS_MODEL.md), not deleted.
 */
export const StudioPhaseRail = memo(({ flow, onPhaseClick, onPinStage, className }: StudioPhaseRailProps) => {
  const phaseTab = (phaseId: StudioPhaseId) => {
    const stageIds = phaseTabStages(phaseId);
    return PROJECT_FLOW_STAGES.find((s) => stageIds.includes(s.id))?.tab;
  };

  return (
    <div className={cn("px-4 pt-3", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {flow.completionPct}% through Studio
        </span>
        {onPinStage && (
          <button
            type="button"
            onClick={() => onPinStage(flow.isPinned ? null : flow.currentStageId)}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            title={flow.isPinned ? "Let Studio auto-detect the phase" : "Pin this phase so it doesn't auto-advance"}
          >
            {flow.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            {flow.isPinned ? "Pinned" : "Pin"}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {STUDIO_PHASES.map((phase, idx) => {
          const status = flow.phaseStatus[phase.id];
          const isLast = idx === STUDIO_PHASES.length - 1;
          const tab = phaseTab(phase.id) ?? "today";
          return (
            <div key={phase.id} className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => onPhaseClick(tab)}
                className={cn(
                  "group flex items-center gap-1.5 px-2 py-1 rounded-md transition-all whitespace-nowrap",
                  status === "current" && "bg-primary/15 ring-1 ring-primary/40",
                  status === "complete" && "hover:bg-muted/60",
                  status === "todo" && "hover:bg-muted/40 opacity-60 hover:opacity-100"
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                    status === "complete" && "bg-primary text-primary-foreground",
                    status === "current" && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                    status === "todo" && "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {status === "complete" ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    status === "current" ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {phase.label}
                </span>
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "h-px w-3 md:w-5 mx-0.5 transition-colors",
                    status === "complete" ? "bg-primary/60" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

StudioPhaseRail.displayName = "StudioPhaseRail";

function phaseTabStages(phaseId: StudioPhaseId): ProjectFlowStageId[] {
  const map: Record<StudioPhaseId, ProjectFlowStageId[]> = {
    discuss: ["discussion"],
    define: ["brief"],
    build: ["tasks", "work"],
    review: ["review"],
    commit: ["agreement", "payment"],
    complete: ["complete"],
  };
  return map[phaseId];
}
