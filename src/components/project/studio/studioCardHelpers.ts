// Solid, on-brand accent colors per mood (no gradients — keeps it editorial).
const MOOD_ACCENT: Record<string, string> = {
  creative: "hsl(174 73% 47%)", // teal (brand)
  urgent: "hsl(8 80% 58%)",
  musical: "hsl(330 100% 65%)", // signal pink
  visual: "hsl(190 70% 45%)",
  chill: "hsl(160 45% 45%)",
};
export const moodAccent = (m?: string | null) => MOOD_ACCENT[m ?? "creative"] ?? MOOD_ACCENT.creative;

export const monogram = (title: string) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export interface StudioProject {
  id: string;
  title: string;
  status?: string | null;
  mood?: string | null;
  cover_url?: string | null;
  client_name?: string | null;
  description?: string | null;
  pinned_stage?: string | null;
  studio_folder_id?: string | null;
  updated_at: string;
}

export const STATUS_PILL: Record<string, { label: string; tone: string }> = {
  active: {
    label: "In Progress",
    tone: "bg-[hsl(var(--energy)/0.18)] text-[hsl(var(--energy))] ring-1 ring-[hsl(var(--energy)/0.45)]",
  },
  planning: { label: "Planning", tone: "bg-background/80 text-foreground ring-1 ring-border" },
  wrapping: { label: "Wrapping Up", tone: "bg-primary/20 text-primary-foreground ring-1 ring-primary/40" },
  completed: { label: "Delivered", tone: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40" },
};

export const PAY_DOT: Record<string, string> = {
  paid: "bg-emerald-500",
  invoiced: "bg-amber-500",
  unsent: "bg-rose-500",
};

export const PAY_LABEL: Record<string, string> = {
  paid: "Paid",
  invoiced: "Invoiced",
  unsent: "No invoice",
};
