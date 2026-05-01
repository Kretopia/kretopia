import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moodEmoji } from "./MoodPicker";
import { moodGradient, moodLabel } from "./moodGradient";

interface StudioProject {
  id: string;
  title: string;
  status?: string | null;
  mood?: string | null;
  cover_url?: string | null;
  client_name?: string | null;
  description?: string | null;
  updated_at: string;
}

interface StudioCardsGridProps {
  projects: StudioProject[];
  invoicesByProject?: Record<string, "paid" | "invoiced" | "unsent">;
  onNewProject: () => void;
}

const STATUS_PILL: Record<string, { label: string; tone: string }> = {
  active: {
    label: "In Progress",
    tone: "bg-[hsl(var(--energy)/0.15)] text-[hsl(var(--energy))] ring-1 ring-[hsl(var(--energy)/0.4)]",
  },
  planning: { label: "Planning", tone: "bg-background/80 text-foreground ring-1 ring-border" },
  wrapping: { label: "Wrapping Up", tone: "bg-primary/20 text-primary-foreground ring-1 ring-primary/40" },
  completed: { label: "Delivered", tone: "bg-card/80 text-foreground ring-1 ring-border" },
};

const PAY_DOT: Record<string, string> = {
  paid: "bg-emerald-500",
  invoiced: "bg-amber-500",
  unsent: "bg-rose-500",
};

const PAY_LABEL: Record<string, string> = {
  paid: "Paid",
  invoiced: "Invoiced",
  unsent: "No invoice",
};

export const StudioCardsGrid = ({
  projects,
  invoicesByProject = {},
  onNewProject,
}: StudioCardsGridProps) => {
  const navigate = useNavigate();

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-10 text-center">
        <p className="text-[10px] font-bold tracking-[0.22em] text-[hsl(var(--energy))] uppercase mb-3">
          ThriveDesk · Studio
        </p>
        <div
          className="mx-auto h-20 w-20 rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-[var(--shadow-glow)]"
          style={{ background: moodGradient("creative") }}
        >
          🎨
        </div>
        <h2 className="text-2xl font-black tracking-[-0.02em] mb-1">Open your first room</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
          Built for creatives. Tell us what you're making — voice or text. We'll set up the room.
        </p>
        <Button onClick={onNewProject} size="lg" className="gap-2 rounded-full">
          <Mic className="h-4 w-4" />
          What are you making?
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {projects.map((project) => {
          const status = STATUS_PILL[project.status ?? "active"] ?? STATUS_PILL.active;
          const glyph = moodEmoji(project.mood) ?? "🎨";
          const pay = invoicesByProject[project.id];

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => navigate(`/desk/${project.id}`)}
              className={cn(
                "group relative text-left overflow-hidden rounded-2xl",
                "border border-border bg-card",
                "transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            >
              {/* Cover */}
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                {project.cover_url ? (
                  <img
                    src={project.cover_url}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-6xl"
                    style={{ background: moodGradient(project.mood) }}
                    aria-label={moodLabel(project.mood)}
                  >
                    <span className="opacity-80 drop-shadow-sm">{glyph}</span>
                  </div>
                )}

                {/* Brand veil — pulls every cover into the violet world */}
                {project.cover_url && (
                  <div
                    className="absolute inset-0 mix-blend-multiply opacity-40 transition-opacity group-hover:opacity-25"
                    style={{ background: "var(--gradient-primary)" }}
                  />
                )}
                {/* Bottom fade for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/40 to-transparent" />

                {/* Status pill */}
                <span
                  className={cn(
                    "absolute top-3 left-3 text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full backdrop-blur-md",
                    status.tone
                  )}
                >
                  {status.label}
                </span>

                {/* Payment dot */}
                {pay && (
                  <span
                    className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-medium text-white/95 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full"
                    title={PAY_LABEL[pay]}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", PAY_DOT[pay])} />
                    {PAY_LABEL[pay]}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-1">
                <h3 className="font-bold text-sm leading-tight line-clamp-1">
                  {project.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">
                    {project.client_name || project.description || "—"}
                  </span>
                  <span className="shrink-0 ml-2 inline-flex items-center gap-1">
                    {project.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {formatDistanceToNow(new Date(project.updated_at), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Floating mic-icon FAB */}
      <button
        type="button"
        onClick={onNewProject}
        aria-label="New project"
        className={cn(
          "fixed z-30 right-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] sm:bottom-8",
          "h-14 w-14 rounded-full bg-primary text-primary-foreground",
          "flex items-center justify-center shadow-lg",
          "transition-all hover:scale-105 active:scale-95",
          "ring-4 ring-primary/20"
        )}
      >
        <Mic className="h-6 w-6" />
      </button>
    </>
  );
};
