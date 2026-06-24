/**
 * KretopiaLanding — cinematic guest landing for Kretopia v1.
 *
 * Visual: dark-first midnight canvas, sunset gradient accents
 * (purple → magenta → coral → orange), real-creator photography,
 * editorial type pairing. Inspired by Figma, Spotify, Canva, Airbnb.
 *
 * Structure:
 *  1. Cinematic hero        — Welcome to Kretopia / Where Creativity Lives
 *  2. Search-Your-Name      — IMDb/LinkedIn-style claim signature
 *  3. Pillar grid           — 8 OS modules
 *  4. Meet Kreto            — your AI Executive Producer
 *  5. Manifesto strip       — emotional closer
 *  6. Footer ecosystem line — Kretopia by Thrive Collective
 *
 * Wires into the existing UnifiedHome guest path. All routes, data
 * fetches and auth logic untouched.
 */
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight, Search, Play, Sparkles, IdCard, Compass, Users2,
  FolderKanban, Radio, Wallet, Calendar, Star,
} from "lucide-react";
import heroImage from "@/assets/kretopia-hero.jpg";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import { BRAND } from "@/lib/brandLexicon";
import { KretoAvatar } from "@/components/brand/KretoAvatar";

interface KretopiaLandingProps {
  onSearchSubmit: (query: string) => void;
}

const PILLARS = [
  { icon: IdCard,       name: "Passport",     tag: "Your creative identity",     route: "/profile",         accent: "from-[#4B2CF5] to-[#FF2CA7]" },
  { icon: Compass,      name: "Scout",        tag: "Find opportunities",         route: "/scout",           accent: "from-[#FF2CA7] to-[#FF6A3D]" },
  { icon: Users2,       name: "Match",        tag: "Find collaborators",         route: "/match",           accent: "from-[#FF2CA7] to-[#FFB347]" },
  { icon: FolderKanban, name: "Studio",       tag: "Manage projects",            route: "/desk",            accent: "from-[#4B2CF5] to-[#FFB347]" },
  { icon: Radio,        name: "SoundStages",  tag: "Live virtual rooms",         route: "/circle?tab=live", accent: "from-[#4B2CF5] to-[#FF6A3D]" },
  { icon: Wallet,       name: "KrePay",       tag: "Contracts & payments",       route: "/thrivepay",       accent: "from-[#FF6A3D] to-[#FFB347]" },
  { icon: Sparkles,     name: "Kreto",        tag: "Your AI Executive Producer", route: "/auth",            accent: "from-[#4B2CF5] via-[#FF2CA7] to-[#FFB347]" },
  { icon: Calendar,     name: "ThriveIN",     tag: "Events · Magazine · IRL",    route: "/circle",          accent: "from-[#FF2CA7] to-[#FFB347]" },
];

const ROTATING_NAMES = ["Ethan Auguste", "Maria Santos", "James Lee", "Aaliyah Brooks", "Kenji Watanabe"];

const KRETO_LINES = [
  "I found three opportunities for you.",
  "Your Creative Passport is 84% complete.",
  "You have a strong match with this creator.",
  "I drafted your proposal — want to review?",
];

export const KretopiaLanding = ({ onSearchSubmit }: KretopiaLandingProps) => {
  const [nameIdx, setNameIdx] = useState(0);
  const [kretoIdx, setKretoIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNameIdx((i) => (i + 1) % ROTATING_NAMES.length), 2400);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setKretoIdx((i) => (i + 1) % KRETO_LINES.length), 3600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">

      {/* ═══════════════════════════════════════════════════════════════════
          1. CINEMATIC HERO
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Sunset glow behind everything */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[700px] w-[1100px] rounded-full opacity-50 blur-[140px]"
               style={{ background: "var(--kretopia-sunset)" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-20 pb-12 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">

            {/* LEFT — editorial headline + CTAs */}
            <div className="lg:col-span-7 relative z-10 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-white/80">
                  Welcome to Kretopia · Beta
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="font-serif text-[3rem] sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-normal tracking-[-0.035em] text-foreground leading-[0.95] mb-6"
              >
                Where{" "}
                <span
                  className="italic font-normal bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--kretopia-sunset)" }}
                >
                  Creativity
                </span>
                <br />
                Lives.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed mb-2"
              >
                Kretopia is the Creative Economy OS.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-9"
              >
                Build your profile. Find opportunities. Meet collaborators. Get paid.
                Grow your career — with <span className="text-foreground font-semibold">Kreto</span>, your AI Executive Producer.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center justify-center lg:justify-start gap-3 flex-wrap"
              >
                <Link
                  to="/auth"
                  className="group inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white shadow-[0_8px_30px_-5px_rgba(255,10,120,0.5)] hover:shadow-[0_12px_40px_-5px_rgba(255,10,120,0.7)] hover:scale-[1.02] transition-all"
                  style={{ background: "var(--kretopia-sunset)" }}
                >
                  Join Beta <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById("kretopia-pillars")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-sm px-6 py-4 text-sm font-semibold text-foreground hover:bg-white/[0.08] transition-all"
                >
                  <Play className="h-4 w-4" /> Watch Demo
                </button>
              </motion.div>

              <p className="mt-6 text-[11px] text-muted-foreground/60">
                Free to join · No credit card · Built for creators
              </p>
            </div>

            {/* RIGHT — hero image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                <img
                  src={heroImage}
                  alt="Filmmaker, music producer, dancer and photographer collaborating in a cinematic studio"
                  width={1024}
                  height={1536}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/0 to-transparent" />
                {/* Bottom card — Kreto whisper */}
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/70 backdrop-blur-xl border border-white/10 p-3.5">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--kretopia-sunset)" }}
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-pink-300 mb-0.5">Kreto</p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={kretoIdx}
                          initial={{ y: 6, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -6, opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="text-xs sm:text-sm text-foreground leading-snug"
                        >
                          {KRETO_LINES[kretoIdx]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          2. SEARCH YOUR NAME — signature claim moment
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-24 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-pink-400 mb-4">
            The Signature Move
          </p>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground leading-[1.05] mb-5">
            Search your name.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Your work already exists across the web. We help you claim it —
            and turn it into a verified <span className="text-foreground font-semibold">Creative Passport</span>.
          </p>

          <div className="relative max-w-2xl mx-auto">
            <div
              className="absolute -inset-1 rounded-3xl opacity-60 blur-xl"
              style={{ background: "var(--kretopia-sunset)" }}
            />
            <div className="relative rounded-2xl bg-card border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 pt-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={nameIdx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.35 }}
                    className="text-xs text-muted-foreground/80 truncate"
                  >
                    Try: <span className="font-semibold text-foreground/90">{ROTATING_NAMES[nameIdx]}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
              <UnifiedSearchDropdown
                variant="hero"
                placeholder="Search your name..."
                onQuerySubmit={onSearchSubmit}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-pink-400" /> Profile exists → claim it</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-amber-400" /> No profile → create yours</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          3. PILLARS — the OS
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="kretopia-pillars" className="relative py-20 sm:py-28 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-pink-400 mb-3">
              The Operating System
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground leading-[1.05] mb-5">
              Everything a creative career needs.<br />
              <span className="text-muted-foreground italic">In one place.</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-lg">
              Eight surfaces. One identity. Built so opportunity, collaboration
              and payment finally live under one roof.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
              >
                <Link
                  to={p.route}
                  className="group relative block rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 p-5 sm:p-6 transition-all overflow-hidden h-full"
                >
                  <div
                    className={`absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-30 blur-2xl bg-gradient-to-br ${p.accent} transition-opacity duration-500`}
                  />
                  <div className={`relative h-10 w-10 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center mb-5 shadow-lg`}>
                    <p.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="relative text-base sm:text-lg font-bold text-foreground mb-1">{p.name}</h3>
                  <p className="relative text-xs sm:text-sm text-muted-foreground leading-snug">{p.tag}</p>
                  <ArrowRight className="relative h-3.5 w-3.5 text-muted-foreground/40 mt-4 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          4. MEET KRETO
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 border-t border-white/[0.06] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full opacity-30 blur-[120px]"
               style={{ background: "var(--kretopia-sunset)" }} />
        </div>

        <div className="container relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Kreto avatar */}
            <div className="relative flex items-center justify-center order-2 lg:order-1">
              <div
                className="relative h-72 w-72 sm:h-80 sm:w-80 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 30% 30%, hsl(330 100% 60% / 0.35), hsl(268 85% 58% / 0.18) 60%, transparent 80%)",
                  boxShadow: "var(--kretopia-glow)",
                }}
              >
                <div className="absolute inset-6 rounded-full border border-white/10" />
                <div className="absolute inset-12 rounded-full border border-white/[0.06]" />
                <KretoAvatar size="lg" />
              </div>
            </div>

            {/* Copy */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-pink-400 mb-3">
                Meet Kreto
              </p>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground leading-[1.05] mb-5">
                The Executive Producer<br />
                <span className="italic text-muted-foreground">who knows everyone.</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0">
                Not a chatbot. Not an assistant. Kreto is a producer, manager, connector and
                strategist — built into every surface of Kretopia.
              </p>
              <ul className="space-y-3 max-w-md mx-auto lg:mx-0 mb-8">
                {[
                  "Scouts opportunities you'd actually want",
                  "Drafts proposals, EPKs and outreach in your voice",
                  "Recommends collaborators who fit the brief",
                  "Reminds you to follow up before deals go cold",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm text-foreground/85">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-pink-400 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white hover:scale-[1.02] transition-transform"
                style={{ background: "var(--kretopia-sunset)" }}
              >
                Meet Kreto <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          5. MANIFESTO STRIP
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-pink-400 mb-5">
            The Promise
          </p>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.02em] text-foreground leading-[1.1] mb-12">
            "I finally have a<br />
            <span className="italic" style={{ backgroundImage: "var(--kretopia-sunset)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              professional home.
            </span>
            "
          </h2>

          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-14">
            {[
              { stat: "Verified", label: "Every credit, co-signed by the people who were there" },
              { stat: "Connected", label: "Match with creators, mentors, brands and clients" },
              { stat: "Paid",      label: "Contracts, invoices and milestone escrow built in" },
            ].map((b) => (
              <div key={b.stat} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-left">
                <p
                  className="font-serif text-2xl italic mb-2"
                  style={{ backgroundImage: "var(--kretopia-sunset)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                >
                  {b.stat}.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.label}</p>
              </div>
            ))}
          </div>

          <div className="max-w-md mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Claim your spot in the beta.</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Early creators get priority access and founding-member pricing.
            </p>
            <OAuthQuickButtons hideDivider />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          6. FOOTER — ecosystem line
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="relative py-14 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {BRAND.parentLine}
            </p>
            <div className="flex items-center gap-6 flex-wrap justify-center text-xs text-muted-foreground">
              <span>
                <span className="text-foreground font-semibold">Kretopia</span> · the platform
              </span>
              <span className="text-border">·</span>
              <span>
                <span className="text-foreground font-semibold">ThriveIN</span> · community & events
              </span>
              <span className="text-border">·</span>
              <span>
                <span className="text-foreground font-semibold">Kreto</span> · your AI Executive Producer
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground/70">
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <span className="text-border">·</span>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <span className="text-border">·</span>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <span className="text-border">·</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <span className="text-border">·</span>
              <Link to="/community-guidelines" className="hover:text-foreground transition-colors">Guidelines</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default KretopiaLanding;
