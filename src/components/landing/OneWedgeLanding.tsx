import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Search, Zap, ArrowRight, Sparkles, CheckCircle2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { trackLandingCta } from "@/hooks/useLandingVariant";

interface Props {
  onSearchSubmit: (q: string) => void;
}

export const OneWedgeLanding = ({ onSearchSubmit }: Props) => {
  const copy = {
    eyebrow: "The Operating System for Creative Careers",
    headline1: "Meet people. Build work.",
    headline2: "Own your record.",
    headline3: "Get paid.",
    subhead:
      "ThriveIN helps creators find collaborators, run real projects, build a verified Creative Passport, and get paid — with Thrive handling the busy work.",
    ctaPrimary: "Claim my Passport — free",
    ctaSecondary: "Browse scouted gigs",
    proofLabel: "Trusted by working creatives across film, music, design & events.",
  };

  return (
    <section className="bg-background">
      {/* Hero block — glow scoped here only so it can't bleed behind stat cards (Android tearing) */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
          <div className="absolute -top-40 -left-20 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-20 -right-20 h-[360px] w-[360px] rounded-full bg-energy/[0.08] blur-[110px]" />
        </div>

        <div className="relative container mx-auto max-w-5xl px-4 sm:px-6 pt-8 sm:pt-14 pb-14">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-energy mb-5 px-3 py-1 rounded-full border border-energy/30 bg-energy/[0.04]"
        >
          <Sparkles className="h-3 w-3" />
          <span className="truncate">{copy.eyebrow}</span>
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-[2.1rem] sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.02] mb-5"
        >
          {copy.headline1}
          <br />
          <span className="text-primary italic">{copy.headline2}</span>
          <br />
          {copy.headline3}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-base sm:text-lg text-foreground/80 font-medium max-w-2xl mb-7 leading-relaxed"
        >
          {copy.subhead}
        </motion.p>

        {/* Two-pillar wedge */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-7 max-w-3xl">
          <PillarCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Verified Credits"
            desc="Claim every project you've worked on. Peer-endorsed and locked to your name forever."
            tone="primary"
          />
          <PillarCard
            icon={<Briefcase className="h-5 w-5" />}
            title="Smart Scout"
            desc="We scan the web daily for paid gigs that match your craft — drafted, ready to apply."
            tone="energy"
          />
        </div>

        {/* Search — claim entry point */}
        <div className="max-w-xl mb-5">
          <p className="text-xs font-black text-energy mb-2 inline-flex items-center gap-1.5">
            Already have work? Search your name <ArrowRight className="h-3.5 w-3.5" />
          </p>
          <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-energy via-primary to-energy shadow-[0_0_30px_-5px_hsl(var(--energy)/0.5)]">
            <div className="rounded-[14px] bg-card">
              <UnifiedSearchDropdown
                variant="hero"
                placeholder="Search your name, project or studio…"
                onQuerySubmit={(q) => {
                  trackLandingCta("wedge", "hero_search");
                  onSearchSubmit(q);
                }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            We'll find your verified credits across the web in seconds.
          </p>
        </div>

        {/* Primary CTA — OAuth */}
        <div className="max-w-md mb-3">
          <div onClickCapture={() => trackLandingCta("wedge", "oauth_cta")}>
            <OAuthQuickButtons hideDivider />
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            Free forever · No credit card · 60-second setup
          </p>
        </div>

        {/* Secondary CTA */}
        <div className="flex flex-wrap gap-3 mt-2">
          <Link to="/scout" onClick={() => trackLandingCta("wedge", "scout_cta")}>
            <Button size="lg" variant="outline" className="font-semibold">
              <Search className="mr-2 h-4 w-4" />
              {copy.ctaSecondary}
            </Button>
          </Link>
        </div>

        {/* Proof bar */}
        <div className="mt-10 pt-6 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-energy" /> Peer-endorsed credits</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-energy" /> Daily gig scout</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-energy" /> Verified identity</span>
        </div>
        <p className="mt-3 text-xs font-medium text-foreground/70">{copy.proofLabel}</p>
        </div>
      </div>

      {/* Social proof carries over from control */}
      <SocialProofSection />

      {/* Final CTA band */}
      <div
        className="container mx-auto max-w-3xl px-4 sm:px-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 9rem)" }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 sm:p-12 text-center">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mb-3 text-balance">
              Start with your credits. Let Scout do the chasing.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
              Free to claim. Pro when you're ready. No credit card.
            </p>
            <Link
              to="/auth?tab=signup"
              onClick={() => trackLandingCta("wedge", "bottom_cta")}
              className="block w-full sm:inline-block sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto font-semibold whitespace-normal h-auto min-h-12 py-3 px-5"
              >
                <Zap className="mr-2 h-5 w-5 shrink-0" />
                <span className="truncate">{copy.ctaPrimary}</span>
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const PillarCard = ({
  icon,
  title,
  desc,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: "primary" | "energy";
}) => (
  <div className="rounded-2xl border border-border/60 bg-card p-4 hover:border-primary/40 transition-colors">
    <div className="flex items-start gap-3">
      <div
        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
          tone === "primary"
            ? "bg-primary/15 text-primary ring-1 ring-primary/20"
            : "bg-energy/15 text-energy ring-1 ring-energy/20"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  </div>
);
