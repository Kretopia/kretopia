/**
 * ClosingSection — final frame. Echoes the hero opener.
 * "Welcome to Kretopia. Where Creativity Lives." + a single CTA.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export const ClosingSection = () => {
  const reducedMotion = useReducedMotion();
  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
    >
      {/* whisper of sunset behind the closing frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 100%, rgba(255,10,120,0.14), transparent 60%), radial-gradient(60% 50% at 50% 0%, rgba(120,70,40,0.10), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12 py-28 sm:py-40 lg:py-48 text-center">
        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/45 mb-10"
          style={{ fontFamily: "'Work Sans', sans-serif" }}
        >
          End Credits · Begin Yours
        </motion.p>

        <motion.h2
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: [0.2, 0.65, 0.3, 0.95] }}
          className="font-serif font-normal text-white leading-[0.95] tracking-[-0.025em]"
          style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
        >
          Welcome to <span className="italic">Kretopia</span>.
          <br />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Where</span>{" "}
          <span className="italic">creativity</span>{" "}
          <span style={{ color: "rgba(255,255,255,0.6)" }}>lives</span>
          <span style={{ color: "#FF2DA1" }}>.</span>
        </motion.h2>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="mt-14 max-w-sm mx-auto"
        >
          <Link
            to="/auth?tab=signup"
            className="inline-flex items-center justify-center gap-2 w-full rounded-full px-8 py-4 text-sm font-semibold tracking-wide text-black bg-white hover:bg-white/90 transition-colors"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Claim your Passport
          </Link>

          <p
            className="mt-5 text-xs text-white/40"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Free to begin. No card. Built for creators.
          </p>

          <div className="mt-10 pt-10 border-t border-white/[0.08]">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40 mb-5"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Or continue with
            </p>
            <OAuthQuickButtons hideDivider />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ClosingSection;
