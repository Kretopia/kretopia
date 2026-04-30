import { cn } from "@/lib/utils";

export const MOODS = [
  { id: "creative", emoji: "🎨", label: "Creative" },
  { id: "urgent", emoji: "🔥", label: "Urgent" },
  { id: "musical", emoji: "🎵", label: "Musical" },
  { id: "visual", emoji: "📸", label: "Visual" },
  { id: "chill", emoji: "🌿", label: "Chill" },
] as const;

export type MoodId = typeof MOODS[number]["id"];

interface MoodPickerProps {
  value: string | null;
  onChange: (mood: MoodId) => void;
  size?: "sm" | "md";
}

export const MoodPicker = ({ value, onChange, size = "md" }: MoodPickerProps) => {
  const dim = size === "sm" ? "h-8 w-8 text-base" : "h-10 w-10 text-lg";
  return (
    <div className="flex items-center gap-1.5">
      {MOODS.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-label={m.label}
            title={m.label}
            className={cn(
              "rounded-full flex items-center justify-center transition-all",
              dim,
              active
                ? "bg-primary/15 ring-2 ring-primary scale-110"
                : "bg-muted hover:bg-muted/70 opacity-70 hover:opacity-100"
            )}
          >
            <span>{m.emoji}</span>
          </button>
        );
      })}
    </div>
  );
};

export const moodEmoji = (id: string | null | undefined) =>
  MOODS.find((m) => m.id === id)?.emoji ?? null;
