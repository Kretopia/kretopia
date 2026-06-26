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
  ArrowRight, Search, Sparkles, Star,
} from "lucide-react";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import { BRAND } from "@/lib/brandLexicon";
import { KretoAvatar } from "@/components/brand/KretoAvatar";
import { PILLAR_MOCKUPS } from "@/components/landing/PillarMockups";
import { KretopiaHero } from "@/components/landing/KretopiaHero";

interface KretopiaLandingProps {
  onSearchSubmit: (query: string) => void;
}

// All pillar CTAs route guests to /auth with a return-to so they land on the
// teased surface immediately after sign-in. Verified routes: /profile /scout
// /match /desk /circle /thrivepay all exist in App.tsx.
const PILLARS = [
  { name: "Passport",    tag: "Your creative identity",     route: "/auth?next=/profile",         accent: "from-[#2A0FD9] to-[#9413D2]" },
  { name: "Scout",       tag: "Find opportunities",         route: "/auth?next=/scout",           accent: "from-[#9413D2] to-[#E0179C]" },
  { name: "Match",       tag: "Find collaborators",         route: "/auth?next=/match",           accent: "from-[#E0179C] to-[#FF3D7A]" },
  { name: "Studio",      tag: "Manage projects",            route: "/auth?next=/desk",            accent: "from-[#2A0FD9] to-[#FEA61A]" },
  { name: "SoundStages", tag: "Live virtual rooms",         route: "/auth?next=/circle?tab=live", accent: "from-[#4812F5] to-[#FF3D7A]" },
  { name: "KrePay",      tag: "Contracts & payments",       route: "/auth?next=/thrivepay",       accent: "from-[#FF3D7A] to-[#FEA61A]" },
  { name: "Kreto",       tag: "Your AI Executive Producer", route: "/auth",                       accent: "from-[#2A0FD9] via-[#E0179C] to-[#FEA61A]" },
  { name: "ThriveIN",    tag: "Events · Magazine · IRL",    route: "/auth?next=/circle",          accent: "from-[#9413D2] to-[#FEA61A]" },
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
          1. CINEMATIC HERO — new editorial direction (Section 1)
          Replaces the old hero + search blocks with KretopiaHero.
      ═══════════════════════════════════════════════════════════════════ */}
      <KretopiaHero onSearchSubmit={onSearchSubmit} />

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLARS.map((p, i) => {
              const Mock = PILLAR_MOCKUPS[p.name];
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.04 }}
                >
                  <Link
                    to={p.route}
                    className="group relative block rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 p-3 sm:p-4 transition-all overflow-hidden h-full"
                  >
                    <div
                      className={`absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-30 blur-2xl bg-gradient-to-br ${p.accent} transition-opacity duration-500`}
                    />
                    {/* Mockup teaser */}
                    <div className="relative mb-3 transition-transform duration-500 group-hover:scale-[1.02]">
                      {Mock ? <Mock /> : null}
                    </div>
                    <div className="relative flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">{p.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-snug truncate">{p.tag}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
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
