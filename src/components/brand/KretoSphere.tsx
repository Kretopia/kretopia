/**
 * KretoSphere — a Siri-style morphing gradient orb standing in for Kreto's
 * AI presence at the desktop launcher FAB (KretoLauncher.tsx), replacing
 * the small blurred-halo portrait that used to render there. Built from
 * layered, independently-drifting blurred color blobs inside a circular
 * mask plus a specular highlight, so it reads as a living glass sphere
 * rather than a flat glow -- the same "powerful presence" language as
 * iOS's Siri orb, in Kretopia's own grey/pink palette instead of Siri's
 * blue/green.
 *
 * Deliberately scoped to just this one call site: KretoAvatar (the
 * portrait) stays exactly as it is everywhere else -- chat drawers, tips,
 * auth, studio -- where it's the established, documented identity.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface KretoSphereProps {
  /** Diameter of the sphere itself, in px. The ambient glow extends beyond it. */
  size?: number;
  animated?: boolean;
  className?: string;
}

export function KretoSphere({ size = 30, animated = true, className }: KretoSphereProps) {
  const glow = size * 1.3;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: glow, height: glow }}
    >
      {/* Ambient halo -- same role as KretoAvatar's own halo, a soft presence
          glow behind the sphere rather than a hard edge against the FAB. */}
      {animated ? (
        <motion.span
          aria-hidden
          className="absolute rounded-full blur-xl"
          style={{ width: glow, height: glow, background: "radial-gradient(circle, rgba(255,45,161,0.55), transparent 70%)" }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <span
          aria-hidden
          className="absolute rounded-full blur-xl"
          style={{ width: glow, height: glow, background: "radial-gradient(circle, rgba(255,45,161,0.4), transparent 70%)" }}
        />
      )}

      {/* The sphere -- a dark glass ball with morphing plasma blobs inside,
          each drifting on its own period so they never fall into sync. */}
      <span
        className="relative block rounded-full overflow-hidden ring-1 ring-white/15"
        style={{ width: size, height: size, background: "radial-gradient(120% 120% at 30% 20%, #2a2a34, #0B0B10 70%)" }}
      >
        {animated ? (
          <>
            <motion.span
              aria-hidden
              className="absolute rounded-full blur-md"
              style={{ width: size * 0.9, height: size * 0.9, left: "-10%", top: "-10%", background: "radial-gradient(circle, #FF2DA1, transparent 65%)" }}
              animate={{ x: [0, size * 0.25, 0], y: [0, size * 0.2, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              aria-hidden
              className="absolute rounded-full blur-md"
              style={{ width: size * 0.8, height: size * 0.8, right: "-15%", bottom: "-15%", background: "radial-gradient(circle, #B93FEA, transparent 65%)" }}
              animate={{ x: [0, -size * 0.2, 0], y: [0, -size * 0.15, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.span
              aria-hidden
              className="absolute rounded-full blur-sm"
              style={{ width: size * 0.5, height: size * 0.5, left: "20%", top: "10%", background: "radial-gradient(circle, #D8DAE6, transparent 70%)" }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        ) : (
          <>
            <span aria-hidden className="absolute rounded-full blur-md" style={{ width: size * 0.9, height: size * 0.9, left: "-10%", top: "-10%", background: "radial-gradient(circle, #FF2DA1, transparent 65%)", opacity: 0.8 }} />
            <span aria-hidden className="absolute rounded-full blur-md" style={{ width: size * 0.8, height: size * 0.8, right: "-15%", bottom: "-15%", background: "radial-gradient(circle, #B93FEA, transparent 65%)", opacity: 0.7 }} />
          </>
        )}
        {/* Specular highlight -- sells the glossy 3D-sphere read. */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{ width: size * 0.35, height: size * 0.35, left: "14%", top: "10%", background: "radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%)" }}
        />
      </span>
    </div>
  );
}

export default KretoSphere;
