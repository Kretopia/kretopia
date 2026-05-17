import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, CheckCircle2, Clock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moodLabel } from "./moodGradient";

// Solid, on-brand accent colors per mood (no gradients — keeps it editorial).
const MOOD_ACCENT: Record<string, string> = {
  creative: "hsl(174 73% 47%)", // teal (brand)
  urgent: "hsl(8 80% 58%)",
  musical: "hsl(330 100% 65%)", // signal pink
  visual: "hsl(190 70% 45%)",
  chill: "hsl(160 45% 45%)",
};
const moodAccent = (m?: string | null) => MOOD_ACCENT[m ?? "creative"] ?? MOOD_ACCENT.creative;

// Two-letter monogram from project title.
const monogram = (title: string) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

interface StudioProject {
  id: string;
  title: string;
  status?: string | null;
  mood?: string | null;
  cover_url?: string | null;
  client_name?: string | null;
  description?: string | null;
  pinned_stage?: string | null;
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
    tone: "bg-[hsl(var(--energy)/0.18)] text-[hsl(var(--energy))] ring-1 ring-[hsl(var(--energy)/0.45)]",
  },
  planning: { label: "Planning", tone: "bg-background/80 text-foreground ring-1 ring-border" },
  wrapping: { label: "Wrapping Up", tone: "bg-primary/20 text-primary-foreground ring-1 ring-primary/40" },
  completed: { label: "Delivered", tone: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40" },
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

  // Pick a hero project (most recent active) for a richer feature card up top.
  const hero = useMemo(
    () => projects.find((p) => p.status === "active") ?? projects[0],
    [projects],
  );
  const rest = useMemo(
    () => (hero ? projects.filter((p) => p.id !== hero.id) : []),
    [projects, hero],
  );

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <p className="text-[10px] font-bold tracking-[0.22em] text-primary uppercase mb-4">
          Studios
        </p>
        <div
          className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-5 border border-border"
          style={{ background: "hsl(var(--card))" }}
        >
          <span className="text-2xl font-black tracking-tight" style={{ color: moodAccent("creative") }}>
            ✦
          </span>
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
      <div className="space-y-3">
        {/* Hero feature card — only when 2+ projects, otherwise grid alone is enough */}
        {hero && rest.length > 0 && (
          <FeatureCard
            project={hero}
            pay={invoicesByProject[hero.id]}
            onClick={() => navigate(`/desk/${hero.id}`)}
          />
        )}

        {/* Editorial studio grid — typography-led, no gradient blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(rest.length > 0 ? rest : projects).map((project) => {
            const status = STATUS_PILL[project.status ?? "active"] ?? STATUS_PILL.active;
            const accent = moodAccent(project.mood);
            const pay = invoicesByProject[project.id];
            const isDone = project.status === "completed";

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/desk/${project.id}`)}
                className={cn(
                  "group relative text-left overflow-hidden rounded-2xl",
                  "border border-border bg-card",
                  "transition-all hover:border-foreground/30 hover:shadow-md hover:-translate-y-0.5",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                )}
              >
                {/* Hairline accent strip — the only color, very thin */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: accent }}
                  aria-hidden
                />

                <div className="pl-4 pr-3 py-3.5 space-y-3">
                  {/* Eyebrow row: status + payment dot */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-[0.14em]",
                        status.label === "Delivered" ? "text-emerald-600" : "text-muted-foreground",
                      )}
                    >
                      {status.label}
                    </span>
                    {pay && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                        title={PAY_LABEL[pay]}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", PAY_DOT[pay])} />
                        {PAY_LABEL[pay]}
                      </span>
                    )}
                  </div>

                  {/* Title — the hero of the card */}
                  <h3 className="font-bold text-[17px] leading-[1.15] tracking-[-0.01em] line-clamp-2 min-h-[2.6em]">
                    {project.title}
                  </h3>

                  {/* Optional client / one-liner */}
                  {(project.client_name || project.description) && (
                    <p className="text-[12px] text-muted-foreground line-clamp-1">
                      {project.client_name ?? project.description}
                    </p>
                  )}

                  {/* Footer rule + meta */}
                  <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span
                      className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] truncate"
                      style={{ color: accent }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: accent }}
                      />
                      <span className="truncate text-foreground/70">
                        {project.pinned_stage || moodLabel(project.mood)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                      {formatDistanceToNowStrict(new Date(project.updated_at))}
                    </span>
                  </div>
                </div>

                {/* Subtle open arrow on hover */}
                <ArrowUpRight className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-foreground/60 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating mic FAB removed — Thrive Bar is the unified voice/AI entry. */}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Feature card — wider hero card for the most recent active project          */
/* -------------------------------------------------------------------------- */

interface FeatureCardProps {
  project: StudioProject;
  pay?: "paid" | "invoiced" | "unsent";
  onClick: () => void;
}

const FeatureCard = ({ project, pay, onClick }: FeatureCardProps) => {
  const status = STATUS_PILL[project.status ?? "active"] ?? STATUS_PILL.active;
  const accent = moodAccent(project.mood);
  const isDone = project.status === "completed";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left overflow-hidden rounded-3xl",
        "border border-border bg-card",
        "transition-all hover:border-foreground/30 hover:shadow-lg hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-primary",
      )}
    >
      {/* Hairline accent bar across top */}
      <span
        className="absolute left-0 right-0 top-0 h-[3px]"
        style={{ background: accent }}
        aria-hidden
      />

      <div className="p-5 sm:p-6 space-y-4">
        {/* Eyebrow row */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            Now in the studio
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {status.label}
          </span>
        </div>

        {/* Monogram + title */}
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 h-14 w-14 rounded-xl border border-border flex items-center justify-center font-black text-lg tracking-tight"
            style={{ color: accent }}
            aria-hidden
          >
            {monogram(project.title)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black leading-[1.05] tracking-[-0.02em] line-clamp-2">
              {project.title}
            </h2>
            {(project.client_name || project.description) && (
              <p className="text-[12px] sm:text-[13px] text-muted-foreground line-clamp-1">
                {project.client_name ?? project.description}
              </p>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
        </div>

        {/* Footer meta */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-foreground/70 truncate">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: accent }}
            />
            {project.pinned_stage || moodLabel(project.mood)}
          </span>
          <span className="inline-flex items-center gap-3 shrink-0">
            {pay && (
              <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
                <span className={cn("h-1.5 w-1.5 rounded-full", PAY_DOT[pay])} />
                {PAY_LABEL[pay]}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {formatDistanceToNowStrict(new Date(project.updated_at))}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
};
