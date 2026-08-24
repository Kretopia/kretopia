import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * CreditsAtmosphere — the futuristic backdrop for the Credits dashboard:
 * a slow aurora wash over a faint blueprint grid. Purely decorative, fixed
 * behind the content, and completely still under prefers-reduced-motion.
 */
export function CreditsAtmosphere() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* blueprint grid */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(90% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(90% 60% at 50% 0%, black, transparent 75%)",
        }}
      />
      {/* aurora blooms */}
      <div
        className={`absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[120px] ${
          reduced ? "" : "animate-credits-drift"
        }`}
        style={{ background: "radial-gradient(circle, rgba(255,45,161,0.20), transparent 65%)" }}
      />
      <div
        className={`absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full blur-[130px] ${
          reduced ? "" : "animate-credits-drift-slow"
        }`}
        style={{ background: "radial-gradient(circle, rgba(23,217,212,0.16), transparent 65%)" }}
      />
      <div
        className={`absolute -left-24 bottom-0 h-[380px] w-[380px] rounded-full blur-[130px] ${
          reduced ? "" : "animate-credits-drift"
        }`}
        style={{ background: "radial-gradient(circle, rgba(255,199,44,0.12), transparent 65%)" }}
      />
      {/* scanline sheen */}
      {!reduced && (
        <div
          className="absolute inset-x-0 top-0 h-40 animate-credits-scan opacity-[0.08]"
          style={{ background: "linear-gradient(to bottom, transparent, #fff, transparent)" }}
        />
      )}
    </div>
  );
}

export default CreditsAtmosphere;
