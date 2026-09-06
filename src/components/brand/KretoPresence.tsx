/**
 * KretoPresence — Kreto's embodied visual presence. Pilot rollout only
 * (Kreto launcher, Landing Hero, Studio contextual tip) per
 * KRETO_3D_REFERENCE_AND_RIGHTS_AUDIT.md.
 *
 * Original design, not a reproduction of any external reference. Built
 * entirely from the character rules in Kretopia_Kreto_Evolution_Brief_v1.docx
 * ("Character rules to lock"), deliberately correcting away from the
 * attached "Blinky-style" reference image (which the brief itself flags as
 * unrefined, not a cleared final asset):
 *   - graphite / near-black body material (not the reference's white shell);
 *   - one warm off-white panel accent, not a mostly-white body;
 *   - the real Kretopia K-mark (via KretoMark, never redrawn/approximated);
 *   - one signal-dot cue on the visor (inspired by the wordmark's own accent
 *     dot) instead of the reference's paired crescent eyes -- a deliberately
 *     different, more original identifying feature;
 *   - the Kretopia pink used only as a small, controlled accent on that one
 *     dot, never as a body wash or constant glow.
 *
 * Pure layered SVG + CSS/Framer Motion transforms (opacity/scale/translate
 * only) -- no WebGL, no three.js, no new dependency. Framer Motion is
 * already used throughout Landing and this repo generally.
 *
 * State is entirely caller-driven and never invented here: this component
 * has no internal timers or fake progress. Every state must correspond to
 * something actually true at the call site -- see each pilot integration's
 * own comment for why it currently only ever passes "idle".
 */
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { KretoMark } from "@/components/brand/KretoMark";
import { cn } from "@/lib/utils";

export type KretoPresenceState = "idle" | "processing" | "proposal_ready" | "success" | "error";
export type KretoPresenceSize = "micro" | "compact" | "card" | "hero";

const SIZE_PX: Record<KretoPresenceSize, number> = {
  micro: 24,
  compact: 40,
  card: 72,
  hero: 200,
};

/** State meaning always exists as real text too -- never color/motion alone. */
const STATE_LABEL: Record<KretoPresenceState, string> = {
  idle: "",
  processing: "Kreto is working on this",
  proposal_ready: "Kreto has a suggestion ready",
  success: "Kreto completed the action",
  error: "Kreto needs your attention",
};

/** Signal-dot color per state -- pink only for the two "good news" states,
 *  a calm muted grey for error (never a scary red, per the brief's own
 *  "never imply the robot failed emotionally" rule). */
function signalColor(state: KretoPresenceState): string {
  switch (state) {
    case "error":
      return "hsl(var(--muted-foreground))";
    default:
      return "hsl(var(--energy))";
  }
}

interface KretoPresenceProps {
  state?: KretoPresenceState;
  size?: KretoPresenceSize;
  /** Provide together with onClick to make this a real, accessible control.
   *  Omit both to keep it decorative (aria-hidden) -- the default. */
  label?: string;
  onClick?: () => void;
  className?: string;
}

export const KretoPresence = ({
  state = "idle",
  size = "card",
  label,
  onClick,
  className,
}: KretoPresenceProps) => {
  const reducedMotion = useReducedMotion();
  const px = SIZE_PX[size];
  const showMark = size === "card" || size === "hero";
  const stateLabel = STATE_LABEL[state];
  const isInteractive = !!onClick;

  const idleFloat = reducedMotion
    ? undefined
    : { y: [0, -4, 0], scale: [1, 1.015, 1] };
  const idleTransition = { duration: 11, repeat: Infinity, ease: "easeInOut" as const };

  const signalAnimate = reducedMotion
    ? undefined
    : state === "processing"
      ? { opacity: [0.55, 1, 0.55], scale: [0.92, 1.08, 0.92] }
      : state === "idle"
        ? { opacity: [0.75, 1, 0.75] }
        : undefined;
  const signalTransition =
    state === "processing"
      ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" as const }
      : { duration: 6, repeat: Infinity, ease: "easeInOut" as const };

  const visual = (
    <motion.div
      className="relative"
      style={{ width: px, height: px }}
      animate={idleFloat}
      transition={idleTransition}
    >
      <svg viewBox="0 0 100 100" width={px} height={px} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="kreto-presence-plate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--secondary))" />
            <stop offset="100%" stopColor="hsl(var(--k-midnight))" />
          </linearGradient>
          <radialGradient id="kreto-presence-signal" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor={signalColor(state)} stopOpacity="1" />
            <stop offset="100%" stopColor={signalColor(state)} stopOpacity="0.45" />
          </radialGradient>
        </defs>

        {/* Graphite / near-black plate -- the body material the brief's own
            "Character rules to lock" calls for, replacing the reference's
            white shell. */}
        <rect x="9" y="7" width="82" height="86" rx="26" fill="url(#kreto-presence-plate)" />
        <rect x="9" y="7" width="82" height="86" rx="26" fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.4" />

        {/* One warm off-white panel accent -- selective, not a body wash. */}
        <path
          d="M 68 68 Q 86 70 84 88 Q 70 92 60 84 Q 62 72 68 68 Z"
          fill="rgba(255,255,255,0.07)"
        />

        {/* The one signal-dot cue, inspired by the wordmark's accent dot --
            deliberately singular, not the reference's paired crescent eyes. */}
        <motion.circle
          cx="50"
          cy="42"
          r="9"
          fill="url(#kreto-presence-signal)"
          animate={signalAnimate}
          transition={signalTransition}
        />
        <circle cx="50" cy="42" r="9" fill="none" stroke={signalColor(state)} strokeOpacity="0.5" strokeWidth="1" />
      </svg>

      {showMark && (
        <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 opacity-90">
          <KretoMark variant="bare" size={size === "hero" ? "sm" : "xs"} />
        </div>
      )}
    </motion.div>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label || "Open Kreto"}
        className={cn(
          "inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--energy))] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          className,
        )}
      >
        {visual}
        {stateLabel && <span className="sr-only">{stateLabel}</span>}
      </button>
    );
  }

  return (
    <div className={cn("inline-flex", className)} aria-hidden="true">
      {visual}
      {stateLabel && <span className="sr-only">{stateLabel}</span>}
    </div>
  );
};

export default KretoPresence;
