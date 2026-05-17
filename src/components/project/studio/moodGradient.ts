// Warm gradient backgrounds for projects without a cover image.
// Uses fixed HSL stops (not opacity-on-tokens) so cards always render with
// vivid color regardless of theme, secondary token, or surface.
// On-brand: rooted in #20D3C2 primary, but each mood has its own vibe.

import { MOODS } from "./MoodPicker";

const GRADIENTS: Record<string, string> = {
  // Warm peach → coral — creative default
  creative: "linear-gradient(135deg, hsl(258 80% 62%), hsl(330 75% 60%))",
  // Sunset red → amber for "on fire" projects
  urgent: "linear-gradient(135deg, hsl(8 80% 58%), hsl(35 88% 60%))",
  // Deep purple → magenta for music
  musical: "linear-gradient(135deg, hsl(280 70% 55%), hsl(320 75% 60%))",
  // Indigo → teal for visual / photo
  visual: "linear-gradient(135deg, hsl(232 75% 58%), hsl(190 70% 50%))",
  // Mint → sage for chill
  chill: "linear-gradient(135deg, hsl(160 50% 50%), hsl(200 55% 55%))",
};

export const moodGradient = (mood: string | null | undefined): string => {
  if (mood && GRADIENTS[mood]) return GRADIENTS[mood];
  return GRADIENTS.creative;
};

export const moodLabel = (mood: string | null | undefined): string =>
  MOODS.find((m) => m.id === mood)?.label ?? "Creative";
