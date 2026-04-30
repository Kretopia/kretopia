// Warm gradient backgrounds for projects without a cover image.
// Uses semantic HSL tokens to stay on-brand. Each mood has a distinct vibe.

import { MOODS } from "./MoodPicker";

export const moodGradient = (mood: string | null | undefined): string => {
  switch (mood) {
    case "urgent":
      return "linear-gradient(135deg, hsl(var(--destructive) / 0.55), hsl(var(--primary) / 0.35))";
    case "musical":
      return "linear-gradient(135deg, hsl(var(--accent) / 0.65), hsl(var(--primary) / 0.45))";
    case "visual":
      return "linear-gradient(135deg, hsl(var(--primary) / 0.55), hsl(var(--secondary) / 0.6))";
    case "chill":
      return "linear-gradient(135deg, hsl(var(--secondary) / 0.7), hsl(var(--accent) / 0.4))";
    case "creative":
    default:
      return "linear-gradient(135deg, hsl(var(--primary) / 0.55), hsl(var(--accent) / 0.45))";
  }
};

export const moodLabel = (mood: string | null | undefined): string =>
  MOODS.find((m) => m.id === mood)?.label ?? "Creative";
