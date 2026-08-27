/**
 * KretoSpectrum — floating AI-presence visualization beside the landing
 * hero's search bar. A grey-to-pink animated waveform that reads as "Kreto
 * is listening," replacing the ambiguous "blurry dot" framing with a
 * legible, state-aware presence signal.
 *
 * Deliberately its own component, not a new KretoAvatar variant: the
 * portrait avatar is the documented brand identity used at 13 call sites
 * elsewhere in the app ("NOT a robot, NOT a sparkle icon" — see
 * KretoAvatar.tsx), and this abstract waveform treatment is specific to
 * the hero's search context. Keeping them separate means neither one's
 * states or reduced-motion handling can regress the other.
 */
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export type SpectrumState = "idle" | "focus" | "typing" | "success" | "error";

const BAR_BASE = [0.34, 0.56, 0.8, 1, 0.8, 0.56, 0.34];

const STATE_COLOR: Record<SpectrumState, string> = {
  idle: "rgba(186, 190, 204, 0.7)",
  focus: "#FF2DA1",
  typing: "#FF2DA1",
  success: "#2FE6A8",
  error: "#FF6B6B",
};

const STATE_SPEED: Record<SpectrumState, number> = {
  idle: 2.4,
  focus: 1.5,
  typing: 0.6,
  success: 1,
  error: 0.55,
};

const STATE_AMPLITUDE: Record<SpectrumState, number> = {
  idle: 0.16,
  focus: 0.32,
  typing: 0.62,
  success: 0.22,
  error: 0.4,
};

interface KretoSpectrumProps {
  state?: SpectrumState;
  className?: string;
  /** Bar height in px at rest (tallest bar). Defaults to a small inline size. */
  size?: number;
}

export function KretoSpectrum({ state = "idle", className, size = 22 }: KretoSpectrumProps) {
  const reducedMotion = useReducedMotion();
  const color = STATE_COLOR[state];
  const speed = STATE_SPEED[state];
  const amplitude = STATE_AMPLITUDE[state];

  if (reducedMotion) {
    // Static fallback: the same waveform shape, held still, in the
    // current state's color — legible as "presence" without any motion.
    return (
      <div className={cn("inline-flex items-center gap-[3px]", className)} role="presentation" aria-hidden>
        {BAR_BASE.map((base, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full"
            style={{ height: `${size * base}px`, background: color, opacity: 0.75 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center justify-center", className)} role="presentation" aria-hidden>
      <motion.div
        className="flex items-center gap-[3px]"
        animate={{ y: [0, -3, 0, 2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {BAR_BASE.map((base, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full"
            style={{ height: `${size * base}px`, background: `linear-gradient(180deg, ${color}, rgba(160,164,178,0.3))` }}
            animate={{
              scaleY: [1 - amplitude * 0.5, 1 + amplitude, 1 - amplitude * 0.35, 1],
              opacity: [0.65, 1, 0.8, 0.65],
            }}
            transition={{ duration: speed, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

export default KretoSpectrum;
