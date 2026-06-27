/**
 * ManifestoSection — Chapter II. The emotional thesis.
 * Pure typography. No image. Lets the page breathe after the hero.
 */
import { motion } from "framer-motion";

export const ManifestoSection = () => {
  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
    >
      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12 py-28 sm:py-40 lg:py-48 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/40 mb-12"
          style={{ fontFamily: "'Work Sans', sans-serif" }}
        >
          A Manifesto · Chapter Two
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.2, 0.65, 0.3, 0.95] }}
          className="font-serif font-normal text-white leading-[1.02] tracking-[-0.025em]"
          style={{ fontSize: "clamp(2.25rem, 6.5vw, 5.5rem)" }}
        >
          Talent is{" "}
          <span className="italic" style={{ color: "rgba(255,255,255,0.55)" }}>everywhere.</span>
          <br />
          Opportunity is{" "}
          <span className="italic">not</span>
          <span style={{ color: "#FF0A78" }}>.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="mt-12 mx-auto max-w-xl text-base sm:text-lg leading-relaxed"
          style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Work Sans', sans-serif" }}
        >
          Kretopia exists to close that gap — a single home where creative careers
          are seen, verified, connected and paid.
        </motion.p>
      </div>
    </section>
  );
};

export default ManifestoSection;
