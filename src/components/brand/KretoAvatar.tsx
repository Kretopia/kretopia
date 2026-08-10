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

interface KretoAvatarProps {
  size?: Size;
  animated?: boolean;
  className?: string;
}

export const KretoAvatar = ({
  size = "md",
  animated = true,
  className,
}: KretoAvatarProps) => {
  const s = SIZE[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Outer breathing halo — sunset gradient */}
      {animated ? (
        <motion.span
          aria-hidden
          className={cn("absolute rounded-full blur-2xl opacity-60", s.halo)}
          style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <span
          aria-hidden
          className={cn("absolute rounded-full blur-2xl opacity-50", s.halo)}
          style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))" }}
        />
      )}

      {/* Avatar disc with gradient rim */}
      <span
        aria-hidden
        className={cn("absolute rounded-full", s.ring)}
        style={{
          background: "var(--kretopia-sunset, hsl(327 100% 59%))",
          padding: "2px",
          WebkitMask: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

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
