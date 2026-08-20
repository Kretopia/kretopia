/**
 * KretoAvatar — the single visual representation of Kreto,
 * the Kretopia AI Executive Producer. Use everywhere Kreto appears
 * (landing, FAB, agent drawer, proactive cards, doc-engine headers).
 *
 * Visual: silhouette portrait + animated sunset halo.
 * NOT a robot, NOT a sparkle icon, NOT a chatbot bubble.
 */
import { motion } from "framer-motion";
import kretoSrc from "@/assets/kreto-avatar.png";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, { box: string; halo: string; ring: string }> = {
  xs: { box: "h-7 w-7",   halo: "h-9 w-9",     ring: "inset-[-3px]" },
  sm: { box: "h-10 w-10", halo: "h-14 w-14",   ring: "inset-[-5px]" },
  md: { box: "h-16 w-16", halo: "h-24 w-24",   ring: "inset-[-10px]" },
  lg: { box: "h-32 w-32", halo: "h-48 w-48",   ring: "inset-[-20px]" },
  xl: { box: "h-64 w-64", halo: "h-[22rem] w-[22rem]", ring: "inset-[-40px]" },
};

/** "idle" is the default ambient breathing loop. "thinking" is a visibly
 *  faster, brighter pulse plus a spinning gradient rim — Kreto's own
 *  identity doubling as the "AI is actively working" indicator, replacing
 *  the generic Loader2 spinners used for this everywhere else in the app. */
type AvatarState = "idle" | "thinking";

interface KretoAvatarProps {
  size?: Size;
  animated?: boolean;
  state?: AvatarState;
  className?: string;
}

export const KretoAvatar = ({
  size = "md",
  animated = true,
  state = "idle",
  className,
}: KretoAvatarProps) => {
  const s = SIZE[size];
  const thinking = state === "thinking";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Outer breathing halo — sunset gradient. Pulses faster and brighter
          while thinking so the same avatar reads as "actively working." */}
      {animated ? (
        <motion.span
          aria-hidden
          className={cn("absolute rounded-full blur-2xl", s.halo)}
          style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))" }}
          animate={
            thinking
              ? { scale: [1, 1.22, 1], opacity: [0.55, 0.95, 0.55] }
              : { scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }
          }
          transition={{ duration: thinking ? 1.1 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <span
          aria-hidden
          className={cn("absolute rounded-full blur-2xl", s.halo)}
          style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))", opacity: thinking ? 0.75 : 0.5 }}
        />
      )}

      {/* Avatar disc rim — static gradient normally; a spinning conic-gradient
          arc while thinking, so the rim itself becomes the loading indicator
          instead of a separate generic spinner living next to the avatar. */}
      {thinking && animated ? (
        <motion.span
          aria-hidden
          className={cn("absolute rounded-full", s.ring)}
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,255,255,0) 0%, var(--kretopia-sunset, hsl(327 100% 59%)) 75%, var(--kretopia-sunset, hsl(327 100% 59%)) 100%)",
            padding: "2px",
            WebkitMask: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
      ) : (
        <span
          aria-hidden
          className={cn("absolute rounded-full", s.ring)}
          style={{
            background: "var(--kretopia-sunset, hsl(327 100% 59%))",
            padding: "2px",
            WebkitMask: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            opacity: thinking ? 0.85 : 1,
          }}
        />
      )}

      <span className={cn("relative rounded-full overflow-hidden bg-[#0B0B10] ring-1 ring-white/10", s.box)}>
        <img
          src={kretoSrc}
          alt="Kreto, your AI Executive Producer"
          width={256}
          height={256}
          loading="lazy"
          className="h-full w-full object-cover object-top scale-110"
          draggable={false}
        />
      </span>
    </div>
  );
};

export default KretoAvatar;
