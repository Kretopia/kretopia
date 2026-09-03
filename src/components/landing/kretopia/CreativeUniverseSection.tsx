/**
 * CreativeUniverseSection — "Creativity doesn't live in one industry."
 * Purely visual/typographic category grid. No fabricated creator
 * photography — none exists in the asset library for this purpose
 * (confirmed in LANDING_V2_AUDIT.md), so real category iconography
 * carries the section instead of stock-feeling or invented imagery.
 */
import { motion } from "framer-motion";
import {
  Clapperboard, Music, Camera, Shirt, PenTool, Palette,
  PartyPopper, Video, Wrench, UtensilsCrossed, Cpu, Sparkles,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACCENT = "#FF2DA1";

const CATEGORIES = [
  { icon: Clapperboard, label: "Film" },
  { icon: Music, label: "Music" },
  { icon: Camera, label: "Photography" },
  { icon: Shirt, label: "Fashion" },
  { icon: PenTool, label: "Design" },
  { icon: Palette, label: "Art" },
  { icon: PartyPopper, label: "Events" },
  { icon: Video, label: "Content" },
  { icon: Wrench, label: "Production" },
  { icon: UtensilsCrossed, label: "Hospitality" },
  { icon: Cpu, label: "Technology" },
  { icon: Sparkles, label: "More" },
];

export const CreativeUniverseSection = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="chapter-universe"
      className="landing-section relative border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="creative-universe-title"
    >
      <div className="relative mx-auto max-w-[1320px]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <h2 id="creative-universe-title" className="landing-h2 landing-glow">
            Creativity doesn't live in one industry.
          </h2>
          <p className="mt-2 text-lg italic text-white/60">Neither do we.</p>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {CATEGORIES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center transition-colors hover:border-white/25"
            >
              <Icon className="h-5 w-5" style={{ color: ACCENT }} aria-hidden />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70"
                style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
              >
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 text-center text-sm font-semibold italic text-white/70"
        >
          One creative world. Connected.
        </motion.p>
      </div>
    </section>
  );
};

export default CreativeUniverseSection;
