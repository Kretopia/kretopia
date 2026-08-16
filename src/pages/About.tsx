/**
 * About — same cinematic language as the landing page: #05070D plate,
 * magenta aurora, grain, serif chapter titles, scroll reveals. Kept short:
 * what Kretopia is, the loop it runs, the three people building it, and one
 * invitation. No ThriveIN copy — Kretopia only.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Fingerprint, ShieldCheck, Compass, LayoutGrid, Sparkles, Globe } from "lucide-react";
import { SEO } from "@/components/SEO";
import { EditorialPageHero } from "@/components/kretopia/EditorialPageHero";
import { Reveal } from "@/components/kretopia/Reveal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACCENT = "#FF2DA1";

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const PILLARS = [
  { icon: Fingerprint, title: "Creative Passport", body: "Your whole career on one link — credits, collaborators, co-signs." },
  { icon: ShieldCheck, title: "Verified Credits", body: "Every claim backed by evidence or the people who were there." },
  { icon: Compass, title: "Scout", body: "Gigs, briefs and casting calls matched to what you actually do." },
  { icon: LayoutGrid, title: "Studio", body: "One room per project — brief, files, chat, deliverables, payment." },
  { icon: Sparkles, title: "Kreto", body: "Your Executive Producer: reads your Passport, turns talk into action." },
  { icon: Globe, title: "One record, worldwide", body: "A creative in Port of Spain, Lagos or Paris is one search away." },
];

const LOOP_STEPS = ["Search", "Passport", "Trust", "Opportunity", "Studio", "Payment", "Stronger Passport"];

const FOUNDERS = [
  {
    name: "Ethan Auguste",
    role: "CEO",
    initials: "EA",
    body: "Built the community first — a decade of rooms, showcases and introductions across Dubai, Los Angeles, Trinidad, Geneva and Bali. He knows who the creatives are because he has been in the room with them.",
  },
  {
    name: "Jefferson Lenox Gordon",
    role: "CDO",
    initials: "JG",
    body: "Design and creative direction. He makes the product feel like the culture it serves — sharp, editorial, and unmistakably built by creatives rather than for them.",
  },
  {
    name: "Noé Plantier",
    role: "CTO",
    initials: "NP",
    body: "Engineering and AI. Verification, Scout and Kreto — the machinery that turns a scattered creative history into something searchable, provable and instantly useful.",
  },
];

/** Full-bleed chapter plate — same surface + reveal as the landing chapters. */
const Chapter = ({
  index, kicker, title, accentWord, children,
}: {
  index: string; kicker: string; title: string; accentWord: string; children: React.ReactNode;
}) => {
  const reducedMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#05070D" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.13]"
        style={{ backgroundImage: GRAIN }}
      />
      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8 py-20 sm:py-28">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.2, 0.65, 0.3, 0.95] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="font-serif italic text-2xl pink-glow-breathe" style={{ color: ACCENT }}>{index}.</span>
            <span className="landing-eyebrow text-white/55">{kicker}</span>
          </div>
          <h2
            className="font-serif font-normal text-white leading-[1.0] tracking-[-0.02em] max-w-3xl"
            style={{ fontSize: "clamp(1.9rem, 4.4vw, 3.4rem)" }}
          >
            {title}{" "}
            <span className="landing-accent">{accentWord}</span>
          </h2>
        </motion.div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
};

const About = () => {
  const [loopRef, loopVisible] = useScrollReveal<HTMLDivElement>();

  return (
    <div className="dark min-h-screen" style={{ backgroundColor: "#05070D" }}>
      <SEO
        title="About Kretopia — The Creative Record, Built by Creatives"
        description="Kretopia turns creative history into trusted opportunity — verified credits, a Creative Passport, and one room per project, connecting artists worldwide."
      />

      <EditorialPageHero
        kicker="About Kretopia"
        oneLine
        title="Built for"
        accentTitle="creatives, everywhere."
        subtitle="Talent is everywhere. Opportunity is not. Kretopia turns creative history into trusted opportunity — and connects the people making the work, wherever they are."
      />

      {/* I — What Kretopia is */}
      <Chapter index="I" kicker="The system" title="Your work, finally" accentWord="on the record.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delayIndex={i}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-[rgba(255,45,161,0.35)]">
                <span
                  className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "rgba(255,45,161,0.1)" }}
                >
                  <p.icon className="h-4 w-4" style={{ color: ACCENT }} />
                </span>
                <p className="text-white font-semibold text-sm mb-1.5">{p.title}</p>
                <p className="text-sm leading-relaxed text-white/55">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Chapter>

      {/* II — The loop */}
      <Chapter index="II" kicker="The loop" title="One cycle that keeps" accentWord="compounding.">
        <div ref={loopRef} className="flex flex-wrap items-center gap-x-1 gap-y-3">
          {LOOP_STEPS.map((step, i) => (
            <span key={step} className="flex items-center">
              <span
                className="whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white/85 transition-all duration-500"
                style={{
                  opacity: loopVisible ? 1 : 0,
                  transform: loopVisible ? "none" : "translateY(6px)",
                  transitionDelay: `${i * 90}ms`,
                  borderColor: "rgba(255,45,161,0.25)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
              >
                {step}
              </span>
              {i < LOOP_STEPS.length - 1 && (
                <ChevronRight className="mx-0.5 h-3.5 w-3.5" style={{ color: "rgba(255,45,161,0.5)" }} aria-hidden />
              )}
            </span>
          ))}
        </div>
        <Reveal delayIndex={2}>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/60">
            Every finished project makes the next one easier to win. That is the whole product — proof in, opportunity out.
          </p>
        </Reveal>
      </Chapter>

      {/* III — The founders */}
      <Chapter index="III" kicker="The founders" title="Three people, one" accentWord="obsession.">
        <div className="grid gap-4 md:grid-cols-3">
          {FOUNDERS.map((f, i) => (
            <Reveal key={f.name} delayIndex={i}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-full font-serif text-lg text-white"
                  style={{ background: "linear-gradient(135deg, rgba(255,45,161,0.55), rgba(255,45,161,0.12))" }}
                  aria-hidden
                >
                  {f.initials}
                </div>
                <p className="text-white font-semibold">{f.name}</p>
                <p className="landing-eyebrow mb-3" style={{ color: ACCENT }}>{f.role}</p>
                <p className="text-sm leading-relaxed text-white/55">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delayIndex={3}>
          <p className="mt-10 max-w-2xl font-serif italic text-lg leading-relaxed text-white/80">
            "A community person, a designer and an engineer building the same thing: a place where what a creative
            has actually done travels with them — across cities, industries and borders."
          </p>
        </Reveal>
      </Chapter>

    </div>
  );
};

export default About;
