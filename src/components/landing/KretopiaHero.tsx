/**
 * KretopiaHero — Section 1 of the cinematic Kretopia landing.
 *
 * Voice: editorial, dark-first, near-monochrome.
 * Color discipline: ink + cream only. ONE whisper of magenta
 * as punctuation (the period after "lives" + the search caret pulse).
 *
 * Layout: 12-col grid. Headline (serif) left, full-bleed portrait right.
 * Below the fold: "Search your name" — real search wired to the existing
 * UnifiedSearchDropdown → /auth claim flow.
 *
 * Inspired by: A24 posters, Monocle covers, Apple TV product pages.
 */
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import portraitImage from "@/assets/kretopia-hero-portrait.jpg";

const ROTATING_NAMES = [
  "Ethan Auguste",
  "Aaliyah Brooks",
  "Kenji Watanabe",
  "Maria Santos",
  "James Lee",
];

interface KretopiaHeroProps {
  onSearchSubmit: (query: string) => void;
}

export const KretopiaHero = ({ onSearchSubmit }: KretopiaHeroProps) => {
  const [nameIdx, setNameIdx] = useState(0);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(
      () => setNameIdx((i) => (i + 1) % ROTATING_NAMES.length),
      2600,
    );
    return () => clearInterval(id);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      inputRef.current?.focus();
      return;
    }
    onSearchSubmit(q);
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#05070D" }}
    >
      {/* warm vignette — barely there */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 80% 20%, rgba(120, 70, 40, 0.18), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(0,0,0,0.6), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12 pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-28">
        {/* Top eyebrow — quiet, editorial */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 mb-12 sm:mb-16 lg:mb-20"
        >
          <span className="h-px w-8 bg-white/30" />
          <span
            className="text-[10px] font-medium uppercase tracking-[0.32em]"
            style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Work Sans', sans-serif" }}
          >
            Kretopia · An Operating System for Creative Careers
          </span>
        </motion.div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          {/* LEFT — editorial headline */}
          <div className="lg:col-span-7 relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.2, 0.65, 0.3, 0.95] }}
              className="font-serif text-white leading-[0.95] tracking-[-0.025em]"
              style={{
                fontSize: "clamp(2.75rem, 8.5vw, 7.5rem)",
                fontWeight: 500,
                WebkitFontSmoothing: "antialiased",
              }}
            >
              Welcome to <span className="italic">Kretopia</span>.
              <br />
              Where <span className="italic" style={{ color: "#FF0A78" }}>creativity</span> lives
              <span style={{ color: "#FF0A78" }}>.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-8 sm:mt-10 max-w-md text-base sm:text-lg leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.7)",
                fontFamily: "'Work Sans', sans-serif",
              }}
            >
              Talent is everywhere. Opportunity is not.
              <br />
              Kretopia exists to close that gap.
            </motion.p>
          </div>

          {/* RIGHT — full-bleed editorial portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.2, 0.65, 0.3, 0.95] }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={portraitImage}
                alt="A creative director on set"
                width={1024}
                height={1280}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* subtle film grain via blend */}
              <div
                aria-hidden
                className="absolute inset-0 mix-blend-overlay opacity-[0.18] pointer-events-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                }}
              />
              {/* bottom fade so the portrait dissolves into ink */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/3"
                style={{
                  background:
                    "linear-gradient(to top, #05070D 0%, rgba(5,7,13,0) 100%)",
                }}
              />

              {/* tiny editorial caption — top right */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "#FF0A78" }}
                />
                <span
                  className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/85"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  On Set · Chapter One
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SEARCH YOUR NAME — the signature move, sits inside the hero
        ────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mt-16 sm:mt-24 lg:mt-28"
        >
          <div className="max-w-2xl">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.32em] mb-5"
              style={{
                color: "rgba(255,255,255,0.55)",
                fontFamily: "'Work Sans', sans-serif",
              }}
            >
              Begin
            </p>
            <h2
              className="font-serif font-normal text-white mb-6"
              style={{
                fontSize: "clamp(1.75rem, 4vw, 3rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Search your name.
            </h2>
            <p
              className="text-sm sm:text-base mb-8 max-w-lg"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontFamily: "'Work Sans', sans-serif",
              }}
            >
              Your work already lives across the web. Find it. Claim it.
              Make it a verified Creative Passport.
            </p>

            {/* Search field — clean single input, submits straight into the claim flow */}
            <form onSubmit={submit} className="relative group max-w-xl">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(60% 100% at 50% 50%, rgba(255,10,120,0.22), transparent 70%)",
                  filter: "blur(24px)",
                }}
              />
              <div
                className="relative flex items-center gap-3 border-b pb-3 transition-colors duration-300 focus-within:border-white/60"
                style={{ borderColor: "rgba(255,255,255,0.22)" }}
              >
                <Search
                  className="h-5 w-5 shrink-0"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                />
                <div className="relative flex-1 min-w-0">
                  {/* Rotating ghost name — only when empty */}
                  {query.length === 0 && (
                    <div
                      className="absolute inset-0 flex items-center pointer-events-none"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={nameIdx}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 0.5, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.5 }}
                          className="text-lg sm:text-xl italic font-serif text-white/50 select-none truncate"
                        >
                          Try “{ROTATING_NAMES[nameIdx]}”
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Search your name"
                    className="relative w-full bg-transparent border-0 outline-none text-white text-lg sm:text-xl font-serif placeholder:text-white/40"
                    style={{ caretColor: "#FF0A78" }}
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Find me"
                  disabled={query.trim().length < 2}
                  className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white text-[#05070D] text-sm font-medium tracking-wide transition-all hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  Find me
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>


            <p
              className="mt-5 text-xs"
              style={{
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Work Sans', sans-serif",
              }}
            >
              Free. No card. Built for creators.
            </p>
          </div>
        </motion.div>
      </div>

      {/* bottom dissolve to next section */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(5,7,13,1))",
        }}
      />
    </section>
  );
};

export default KretopiaHero;
