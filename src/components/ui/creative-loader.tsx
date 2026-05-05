import { useEffect, useMemo, useState } from "react";
import {
  Camera, Music2, Disc3, Palette, PenTool, Film, Scissors,
  Lightbulb, Mic, Headphones, Sparkles, Aperture, Guitar,
  Clapperboard, Brush, Tv2, Radio, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** A creative "scene coming alive" — replaces generic spinners with a themed
 *  vignette (guitarist plugging in, photographer framing a shot, DJ cueing a
 *  track, etc). Pure CSS, no deps, deterministic per vignette.
 */

export type CreativeVignette =
  | "studio"
  | "music"
  | "guitarist"
  | "dj"
  | "photographer"
  | "filmmaker"
  | "painter"
  | "writer"
  | "stylist"
  | "podcaster"
  | "event"
  | "designer";

interface Scene {
  hero: typeof Camera;          // central icon
  orbit: Array<typeof Camera>;  // 4 floating gear icons
  tint: string;                 // tailwind text color class for hero glow
  lines: string[];              // rotating status lines
  label: string;                // short scene label
}

const SCENES: Record<CreativeVignette, Scene> = {
  studio: {
    hero: Sparkles,
    orbit: [Camera, Mic, Music2, Film],
    tint: "text-primary",
    label: "Studio",
    lines: [
      "Powering up the studio",
      "Cueing your crew",
      "Setting the mood",
      "Almost ready…",
    ],
  },
  music: {
    hero: Music2,
    orbit: [Headphones, Mic, Disc3, Radio],
    tint: "text-primary",
    label: "Music",
    lines: [
      "Tuning the room",
      "Cueing the first take",
      "Mixing the vibe",
      "Almost ready…",
    ],
  },
  guitarist: {
    hero: Guitar,
    orbit: [Mic, Headphones, Music2, Lightbulb],
    tint: "text-energy",
    label: "Guitarist",
    lines: [
      "Plugging in",
      "Stringing up",
      "Tuning the rig",
      "Hitting record…",
    ],
  },
  dj: {
    hero: Disc3,
    orbit: [Headphones, Music2, Radio, Lightbulb],
    tint: "text-energy",
    label: "DJ",
    lines: [
      "Loading the decks",
      "Cueing the next track",
      "Beat-matching",
      "Dropping in…",
    ],
  },
  photographer: {
    hero: Camera,
    orbit: [Aperture, Lightbulb, Palette, Wand2],
    tint: "text-primary",
    label: "Photo",
    lines: [
      "Loading the lens",
      "Framing the shot",
      "Setting the lights",
      "Almost ready…",
    ],
  },
  filmmaker: {
    hero: Clapperboard,
    orbit: [Camera, Film, Mic, Lightbulb],
    tint: "text-primary",
    label: "Film",
    lines: [
      "Calling places",
      "Lighting the set",
      "Rolling sound",
      "Action…",
    ],
  },
  painter: {
    hero: Brush,
    orbit: [Palette, PenTool, Wand2, Sparkles],
    tint: "text-energy",
    label: "Studio",
    lines: [
      "Stretching the canvas",
      "Mixing the palette",
      "Loading the brush",
      "First stroke…",
    ],
  },
  writer: {
    hero: PenTool,
    orbit: [Sparkles, Lightbulb, Wand2, Palette],
    tint: "text-primary",
    label: "Writer",
    lines: [
      "Sharpening the pen",
      "Outlining the scene",
      "Catching the thread",
      "First line…",
    ],
  },
  stylist: {
    hero: Scissors,
    orbit: [Palette, Wand2, Sparkles, Camera],
    tint: "text-energy",
    label: "Stylist",
    lines: [
      "Pulling the looks",
      "Steaming the rack",
      "Final fittings",
      "Almost ready…",
    ],
  },
  podcaster: {
    hero: Mic,
    orbit: [Headphones, Radio, Music2, Tv2],
    tint: "text-primary",
    label: "Podcast",
    lines: [
      "Mic check, one two",
      "Levels looking good",
      "Cueing the intro",
      "Rolling…",
    ],
  },
  event: {
    hero: Lightbulb,
    orbit: [Music2, Camera, Mic, Sparkles],
    tint: "text-energy",
    label: "Event",
    lines: [
      "Rigging the lights",
      "Sound check",
      "Opening the doors",
      "Almost showtime…",
    ],
  },
  designer: {
    hero: Palette,
    orbit: [PenTool, Wand2, Sparkles, Brush],
    tint: "text-primary",
    label: "Design",
    lines: [
      "Loading the canvas",
      "Sampling colors",
      "Aligning the grid",
      "Almost ready…",
    ],
  },
};

const ALL_VIGNETTES = Object.keys(SCENES) as CreativeVignette[];

/** Pick a vignette from a free-form role string or workspace_type. */
export function vignetteForContext(input?: string | null): CreativeVignette | null {
  if (!input) return null;
  const r = input.toLowerCase();
  if (/(\bdj\b|turntab|selector)/.test(r)) return "dj";
  if (/(guitar)/.test(r)) return "guitarist";
  if (/(music|producer|engineer|mix|master|songwriter|singer|vocal|composer|beatmaker|rapper|artist|musician)/.test(r)) return "music";
  if (/(podcast|host)/.test(r)) return "podcaster";
  if (/(film|director|cinemato|dop|gaffer|editor|colorist|vfx|motion|video)/.test(r)) return "filmmaker";
  if (/(photo|retouch|lookbook)/.test(r)) return "photographer";
  if (/(paint|illustrat|tattoo|sculpt|3d|graphic)/.test(r)) return "painter";
  if (/(writer|copywrit|journalist|author|poet|script)/.test(r)) return "writer";
  if (/(stylist|fashion|tailor|wardrobe|model)/.test(r)) return "stylist";
  if (/(event|promoter|coordinator|planner|festival|concert|production)/.test(r)) return "event";
  if (/(design|brand|agency|art director|creative director)/.test(r)) return "designer";
  // workspace_type fallbacks
  if (/(photo_shoot)/.test(r)) return "photographer";
  if (/(video_shoot|content_series|edit_job)/.test(r)) return "filmmaker";
  if (/(music_project)/.test(r)) return "music";
  if (/(dj_live_gig)/.test(r)) return "dj";
  if (/(fashion_show)/.test(r)) return "stylist";
  if (/(event_production|brand_collab)/.test(r)) return "event";
  if (/(commissioned_art)/.test(r)) return "painter";
  return null;
}

const SIZES = {
  sm: { wrap: "py-3", core: "h-12 w-12", icon: "h-5 w-5", text: "text-[11px]", orbitR: 26, orbitIcon: 12 },
  md: { wrap: "py-6", core: "h-20 w-20", icon: "h-8 w-8", text: "text-xs", orbitR: 50, orbitIcon: 16 },
  lg: { wrap: "py-10", core: "h-28 w-28", icon: "h-10 w-10", text: "text-sm", orbitR: 72, orbitIcon: 20 },
  page: { wrap: "min-h-[60vh] py-12", core: "h-32 w-32", icon: "h-12 w-12", text: "text-sm", orbitR: 84, orbitIcon: 22 },
} as const;

interface CreativeLoaderProps {
  /** Pick a specific scene. If omitted, will infer from `context` or pick randomly. */
  vignette?: CreativeVignette;
  /** Free-form role / workspace_type used to smart-pick a vignette. */
  context?: string | null;
  /** Optional override for the status line (otherwise scene cycles its own). */
  label?: string;
  /** Optional sublabel under the status line. */
  hint?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export const CreativeLoader = ({
  vignette,
  context,
  label,
  hint,
  size = "md",
  className,
}: CreativeLoaderProps) => {
  // Pick + LOCK the vignette so it doesn't reshuffle on re-render
  const picked = useMemo<CreativeVignette>(() => {
    if (vignette) return vignette;
    const fromCtx = vignetteForContext(context);
    if (fromCtx) return fromCtx;
    return ALL_VIGNETTES[Math.floor(Math.random() * ALL_VIGNETTES.length)];
  }, [vignette, context]);

  const scene = SCENES[picked];
  const s = SIZES[size];
  const Hero = scene.hero;

  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    if (label) return; // static label mode — don't cycle
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % scene.lines.length);
    }, 1400);
    return () => clearInterval(id);
  }, [scene.lines.length, label]);

  const currentLine = label ?? scene.lines[stepIdx];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden",
        s.wrap,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={currentLine}
    >
      {/* Soft spotlight backdrop */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.15), transparent 45%), radial-gradient(circle at 75% 80%, hsl(var(--energy) / 0.12), transparent 50%)",
          animation: "creative-pan 6s ease-in-out infinite alternate",
        }}
      />

      {/* Center stage */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: s.orbitR * 2 + 48, height: s.orbitR * 2 + 48 }}
      >
        {/* Pulsing rings */}
        <div
          className="absolute inset-0 m-auto rounded-full border-2 border-primary/25"
          style={{ width: s.orbitR * 2, height: s.orbitR * 2, animation: "creative-ring 2.4s ease-out infinite" }}
        />
        <div
          className="absolute inset-0 m-auto rounded-full border-2 border-energy/30"
          style={{ width: s.orbitR * 2, height: s.orbitR * 2, animation: "creative-ring 2.4s ease-out 0.8s infinite" }}
        />

        {/* Orbiting gear icons (4, evenly spaced) */}
        {scene.orbit.map((Icon, i) => {
          const angle = (i / scene.orbit.length) * 360;
          return (
            <div
              key={i}
              className="absolute text-muted-foreground/55"
              style={{
                width: s.orbitIcon,
                height: s.orbitIcon,
                transform: `rotate(${angle}deg) translateY(-${s.orbitR}px) rotate(-${angle}deg)`,
                animation: `creative-float 3.6s ease-in-out ${i * 0.25}s infinite`,
              }}
            >
              <Icon style={{ width: s.orbitIcon, height: s.orbitIcon }} />
            </div>
          );
        })}

        {/* Hero core */}
        <div
          className={cn(
            "relative rounded-full bg-gradient-to-br from-primary to-energy shadow-2xl flex items-center justify-center",
            s.core,
          )}
          style={{ animation: "creative-pulse 1.6s ease-in-out infinite" }}
        >
          <Hero
            key={picked}
            className={cn("text-primary-foreground animate-scale-in", s.icon)}
          />
        </div>
      </div>

      {/* Status line */}
      <div className="relative z-10 mt-4 text-center px-4 max-w-xs">
        <p key={stepIdx + currentLine} className={cn("font-semibold animate-fade-in", s.text === "text-[11px]" ? "text-xs" : "text-sm")}>
          {currentLine}
        </p>
        {!label && (
          <div className="mt-2 flex items-center justify-center gap-1">
            {scene.lines.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === stepIdx ? 16 : 5,
                  background:
                    i === stepIdx
                      ? "hsl(var(--primary))"
                      : i < stepIdx
                      ? "hsl(var(--primary) / 0.5)"
                      : "hsl(var(--muted-foreground) / 0.3)",
                }}
              />
            ))}
          </div>
        )}
        {hint && (
          <p className={cn("mt-2 text-muted-foreground", s.text)}>{hint}</p>
        )}
      </div>

      <style>{`
        @keyframes creative-pan {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-16px, 8px); }
        }
        @keyframes creative-float {
          0%, 100% { transform: var(--tw-transform); }
        }
        @keyframes creative-ring {
          0% { transform: scale(0.85); opacity: 0.75; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes creative-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 24px hsl(var(--primary) / 0.35); }
          50% { transform: scale(1.06); box-shadow: 0 0 44px hsl(var(--primary) / 0.65); }
        }
      `}</style>
    </div>
  );
};

export default CreativeLoader;
