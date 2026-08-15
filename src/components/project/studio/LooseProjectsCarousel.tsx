import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { CheckCircle2, Clock, MoreVertical, Sparkles, FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { moodAccent, STATUS_PILL, PAY_DOT, PAY_LABEL, type StudioProject } from "./studioCardHelpers";
import { moodLabel } from "./moodGradient";
import type { StudioFolder } from "./StudioFoldersBar";
import { MoveToFolderSheet } from "./MoveToFolderSheet";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { CarouselPositionDots } from "@/components/ui/glass/CarouselPositionDots";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface LooseProjectsCarouselProps {
  projects: StudioProject[];
  invoicesByProject?: Record<string, "paid" | "invoiced" | "unsent">;
  folders?: StudioFolder[];
  onMoveToFolder?: (projectId: string, folderId: string | null) => void;
  loading?: boolean;
}

/**
 * LooseProjectsCarousel — every unfiled Studio project in one horizontal,
 * keyboard/swipe-navigable rail instead of a plain grid buried below the
 * folder tiles. The most recently active project surfaces first — a real,
 * computed fact (status + updated_at), not an invented recommendation —
 * and is the only one labeled "Most active" so the ordering is explained
 * rather than left implicit.
 */
export const LooseProjectsCarousel = ({
  projects,
  invoicesByProject = {},
  folders = [],
  onMoveToFolder,
  loading = false,
}: LooseProjectsCarouselProps) => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [moveTarget, setMoveTarget] = useState<StudioProject | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  // Priority sort: active projects first, then by most recent activity —
  // both real, existing fields. No fabricated scoring.
  const sorted = useMemo(() => {
    const statusRank: Record<string, number> = { active: 0, planning: 1, wrapping: 2, completed: 3 };
    return [...projects].sort((a, b) => {
      const rankA = statusRank[a.status ?? "active"] ?? 1;
      const rankB = statusRank[b.status ?? "active"] ?? 1;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [projects]);

  const beginLongPress = (project: StudioProject) => {
    if (!onMoveToFolder) return;
    longPressFired.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(15); } catch { /* noop */ }
      }
      setMoveTarget(project);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your loose projects…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-5 text-center space-y-1">
        <FolderOpen className="h-5 w-5 mx-auto text-muted-foreground/60 mb-1" />
        <p className="text-sm font-semibold">Nothing loose right now</p>
        <p className="text-xs text-muted-foreground">Every project is filed into a folder.</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Carousel
          setApi={setApi}
          opts={{ align: "start", dragFree: true, duration: reducedMotion ? 0 : 20 }}
          className="w-full"
          aria-label="Loose projects"
        >
          <CarouselContent className="-ml-3">
            {sorted.map((project, i) => {
              const status = STATUS_PILL[project.status ?? "active"] ?? STATUS_PILL.active;
              const accent = moodAccent(project.mood);
              const pay = invoicesByProject[project.id];
              const isDone = project.status === "completed";
              const isMostActive = i === 0 && project.status === "active";

              return (
                <CarouselItem key={project.id} className="pl-3 basis-auto">
                  <div
                    role="button"
                    tabIndex={0}
                    draggable={!!onMoveToFolder}
                    onDragStart={(e) => {
                      if (!onMoveToFolder) return;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("application/x-thrive-project", project.id);
                      e.dataTransfer.setData("text/plain", project.title);
                    }}
                    onPointerDown={(e) => {
                      if (e.pointerType === "touch") beginLongPress(project);
                    }}
                    onPointerUp={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    onPointerMove={(e) => {
                      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 4) cancelLongPress();
                    }}
                    onClick={() => {
                      if (longPressFired.current) {
                        longPressFired.current = false;
                        return;
                      }
                      navigate(`/desk/${project.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/desk/${project.id}`);
                      }
                    }}
                    className={cn(
                      "group relative w-64 text-left overflow-hidden rounded-2xl cursor-pointer select-none",
                      "border border-border bg-card",
                      "transition-all hover:border-foreground/30 hover:shadow-md hover:-translate-y-0.5",
                      "focus:outline-none focus:ring-2 focus:ring-primary",
                    )}
                  >
                    <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} aria-hidden />

                    <div className="pl-4 pr-3 py-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-[0.14em]",
                            status.label === "Delivered" ? "text-emerald-600" : "text-muted-foreground",
                          )}
                        >
                          {status.label}
                        </span>
                        {isMostActive && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-energy">
                            <Sparkles className="h-2.5 w-2.5" />
                            Most active
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-[15px] leading-[1.15] tracking-[-0.01em] line-clamp-2 min-h-[2.3em]">
                        {project.title}
                      </h3>

                      {(project.client_name || project.description) && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {project.client_name ?? project.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] truncate" style={{ color: accent }}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                          <span className="truncate text-foreground/70">
                            {project.pinned_stage || moodLabel(project.mood)}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 shrink-0">
                          {isDone ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                          {formatDistanceToNowStrict(new Date(project.updated_at))}
                        </span>
                      </div>

                      {pay && (
                        <div className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <span className={cn("h-1.5 w-1.5 rounded-full", PAY_DOT[pay])} />
                          {PAY_LABEL[pay]}
                        </div>
                      )}
                    </div>

                    {onMoveToFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveTarget(project);
                        }}
                        aria-label={`Move ${project.title} to folder`}
                        className="absolute top-1.5 right-1.5 h-8 w-8 rounded-full grid place-items-center bg-background/80 border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious variant="glass" className="hidden sm:flex -left-3" aria-label="Previous — loose projects" />
          <CarouselNext variant="glass" className="hidden sm:flex -right-3" aria-label="Next — loose projects" />
        </Carousel>
        <CarouselPositionDots api={api} label="Loose projects" className="mt-2" />
      </div>

      {onMoveToFolder && (
        <MoveToFolderSheet
          open={!!moveTarget}
          onOpenChange={(v) => !v && setMoveTarget(null)}
          folders={folders}
          currentFolderId={moveTarget?.studio_folder_id ?? null}
          projectTitle={moveTarget?.title}
          onMove={(folderId) => {
            if (moveTarget) onMoveToFolder(moveTarget.id, folderId);
          }}
        />
      )}
    </>
  );
};

export default LooseProjectsCarousel;
