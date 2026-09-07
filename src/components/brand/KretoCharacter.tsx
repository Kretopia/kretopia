/**
 * KretoCharacter — Kretopia's real, owned 3D character render of Kreto.
 * Confirmed team-owned asset (not a third-party reference) -- see
 * KRETO_CHARACTER_ASSET_REPORT.md. Five cropped stills from the source
 * "Meet Kreto" artwork: the main character plus four role variants
 * (Scout, Connector, Producer, Publicist).
 *
 * This is a small number of static photographic poses, not a rigged 3D
 * model -- there is exactly one pose per variant, so this component
 * cannot express different facial expressions per app state the way the
 * abstract KretoPresence can. State is instead layered on top as a small
 * signal-dot badge (same accent-dot language as KretoPresence, same
 * honesty rule: only render a non-idle badge when something real is
 * happening) plus the same paired sr-only text announcement -- state is
 * still never color/motion alone.
 *
 * "main" gets a soft radial fade (CSS mask-image) so its photographic
 * rectangle blends into the app's permanently-dark surfaces instead of
 * reading as a pasted sticker. The four role variants render inside a
 * rounded-square tile, matching their own presentation in the source
 * artwork -- a defined edge is correct there, not a flaw to hide.
 *
 * `hoverable` adds a real mouse-hover reaction (a small wiggle) for
 * surfaces that want the cast to feel alive to a pointer, per direct
 * feedback on the Landing Hero -- off by default everywhere else.
 */
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import kretoMain from "@/assets/brand/kreto/kreto-main.jpg";
import kretoScout from "@/assets/brand/kreto/kreto-scout.jpg";
import kretoConnector from "@/assets/brand/kreto/kreto-connector.jpg";
import kretoProducer from "@/assets/brand/kreto/kreto-producer.jpg";
import kretoPublicist from "@/assets/brand/kreto/kreto-publicist.jpg";

export type KretoCharacterVariant = "main" | "scout" | "connector" | "producer" | "publicist";
export type KretoCharacterState =
  | "idle"
  | "attentive"
  | "listening"
  | "processing"
  | "proposal_ready"
  | "success"
  | "caution"
  | "error"
  | "offline";

const VARIANT_SRC: Record<KretoCharacterVariant, string> = {
  main: kretoMain,
  scout: kretoScout,
  connector: kretoConnector,
  producer: kretoProducer,
  publicist: kretoPublicist,
};

const VARIANT_LABEL: Record<KretoCharacterVariant, string> = {
  main: "Kreto",
  scout: "Kreto — Scout",
  connector: "Kreto — Connector",
  producer: "Kreto — Producer",
  publicist: "Kreto — Publicist",
};

/** Same wording as KretoPresence's STATE_LABEL, kept in sync deliberately
 *  -- one honest vocabulary for "what is Kreto doing", regardless of
 *  which visual (abstract mark or real character) is rendering it. */
const STATE_LABEL: Record<KretoCharacterState, string> = {
  idle: "",
  attentive: "",
  listening: "Kreto is listening",
  processing: "Kreto is working on this",
  proposal_ready: "Kreto has a suggestion ready",
  success: "Kreto completed the action",
  caution: "Kreto needs you to review something before it continues",
  error: "Kreto needs your attention",
  offline: "Kreto is unavailable right now",
};

function badgeColor(state: KretoCharacterState): string {
  switch (state) {
    case "caution":
      return "hsl(var(--warning))";
    case "error":
    case "offline":
      return "hsl(var(--muted-foreground))";
    default:
      return "hsl(var(--energy))";
  }
}

interface KretoCharacterProps {
  variant?: KretoCharacterVariant;
  /** Pixel width; height follows the source image's own aspect ratio. */
  size?: number;
  state?: KretoCharacterState;
  label?: string;
  className?: string;
  /** How far the idle float travels, in px. Vary per instance so a group
   *  of these doesn't visibly move in lockstep. */
  floatAmplitude?: number;
  /** Full float cycle length, in seconds. */
  floatDuration?: number;
  /** Delay before the float starts, in seconds -- the other half of
   *  breaking lockstep motion across multiple instances. */
  floatDelay?: number;
  /** Real mouse-hover reaction (a small playful wiggle) -- off by default
   *  since most instances are purely decorative background elements with
   *  no reason to intercept pointer events at all. When on, only this
   *  element (not its absolutely-positioned wrapper) re-enables pointer
   *  events, so it can't steal clicks meant for anything else nearby. */
  hoverable?: boolean;
}

export const KretoCharacter = ({
  variant = "main",
  size = 160,
  state = "idle",
  label,
  className,
  floatAmplitude = 6,
  floatDuration = 6,
  floatDelay = 0,
  hoverable = false,
}: KretoCharacterProps) => {
  const reducedMotion = useReducedMotion();
  const isMain = variant === "main";
  const showBadge = state !== "idle" && state !== "attentive";

  const idleFloat = reducedMotion ? undefined : { y: [0, -floatAmplitude, 0] };
  const idleTransition = {
    duration: floatDuration,
    delay: floatDelay,
    repeat: Infinity,
    ease: "easeInOut" as const,
  };

  const hoverAnimation =
    hoverable && !reducedMotion
      ? {
          scale: 1.15,
          rotate: [0, -6, 6, -3, 0],
          transition: { duration: 0.5, ease: "easeInOut" as const },
        }
      : undefined;

  return (
    <motion.div
      className={cn("relative inline-block", hoverable && "pointer-events-auto cursor-default", className)}
      style={{ width: size }}
      animate={idleFloat}
      whileHover={hoverAnimation}
      transition={idleTransition}
      aria-hidden="true"
    >
      <img
        src={VARIANT_SRC[variant]}
        alt=""
        draggable={false}
        className={cn("w-full h-auto select-none", isMain ? "" : "rounded-2xl")}
        style={
          isMain
            ? {
                maskImage: "radial-gradient(75% 80% at 50% 45%, #000 55%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(75% 80% at 50% 45%, #000 55%, transparent 100%)",
              }
            : {
                boxShadow: "0 0 0 1px hsl(var(--border) / 0.4), 0 10px 28px -12px rgba(0,0,0,0.6)",
              }
        }
      />

      {showBadge && (
        <span
          aria-hidden
          className="absolute top-[10%] right-[10%] h-2.5 w-2.5 rounded-full ring-2 ring-background"
          style={{ backgroundColor: badgeColor(state) }}
        />
      )}

      <span className="sr-only">
        {label || VARIANT_LABEL[variant]}
        {showBadge ? ` — ${STATE_LABEL[state]}` : ""}
      </span>
    </motion.div>
  );
};

export default KretoCharacter;
