/**
 * MeetKretoSection — the AI Executive Producer chapter.
 * Editorial, restrained. Sunset only here — Kreto is the one moment
 * the full brand gradient is allowed to breathe.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { KretoAvatar } from "@/components/brand/KretoAvatar";

const LINES = [
  "I found three opportunities for you.",
  "Your Passport is 84% complete.",
  "I drafted your proposal — want to review?",
  "This collaborator fits your brief.",
];

export const MeetKretoSection = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % LINES.length), 3400);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 30% 50%, rgba(75,44,245,0.22), transparent 60%), radial-gradient(40% 50% at 70% 60%, rgba(255,44,167,0.18), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12 py-24 sm:py-32 lg:py-40">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-20 items-center">
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1 }}
            className="lg:col-span-5 flex items-center justify-center order-2 lg:order-1"
          >
            <div className="relative">
              <KretoAvatar size="xl" />
              {/* whisper line, like a subtitle under the avatar */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-72 text-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 0.75, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.5 }}
                    className="font-serif italic text-base text-white/75"
                  >
                    "{LINES[i]}"
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9 }}
            className="lg:col-span-7 order-1 lg:order-2"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="font-serif italic text-2xl" style={{ color: "#FFB347" }}>VII.</span>
              <span
                className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/55"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Kreto · The Executive Producer
              </span>
            </div>

            <h2
              className="font-serif font-normal text-white leading-[0.98] tracking-[-0.025em]"
              style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.75rem)" }}
            >
              Not an assistant.<br />
              <span className="italic" style={{ color: "rgba(255,255,255,0.6)" }}>A producer who</span><br />
              knows everyone<span style={{ color: "#FF0A78" }}>.</span>
            </h2>

            <p
              className="mt-8 max-w-lg text-base sm:text-lg leading-relaxed"
              style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Work Sans', sans-serif" }}
            >
              Kreto scouts the work you'd actually want, drafts in your voice,
              and connects you to the people who get it. Quiet, always-on,
              built into every surface of Kretopia.
            </p>

            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 mt-10 text-sm tracking-wide"
              style={{ fontFamily: "'Work Sans', sans-serif", color: "rgba(255,255,255,0.9)" }}
            >
              <span className="border-b border-white/30 group-hover:border-white pb-0.5 transition-colors">
                Meet Kreto
              </span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "#FFB347" }} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MeetKretoSection;
