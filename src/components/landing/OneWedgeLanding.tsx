import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  Users,
  AudioLines,
  FolderKanban,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  Zap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { trackLandingCta } from "@/hooks/useLandingVariant";

interface Props {
  onSearchSubmit: (q: string) => void;
}

const BrandDots = () => (
  <div className="flex items-center gap-1.5" aria-hidden>
    <span className="h-2 w-2 rounded-full bg-[#FF4DA6]" />
    <span className="h-2 w-2 rounded-full bg-[#FFB020]" />
    <span className="h-2 w-2 rounded-full bg-[#20D3C2]" />
  </div>
);

export const OneWedgeLanding = ({ onSearchSubmit }: Props) => {
  return (
    <section className="bg-background">
      {/* ───────────── HERO ───────────── */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
          <div className="absolute -top-40 -left-20 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-20 -right-20 h-[360px] w-[360px] rounded-full bg-energy/[0.08] blur-[110px]" />
        </div>

        <div className="relative container mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-14 pb-12">
          <BrandDots />

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-5 font-serif text-[2.4rem] sm:text-6xl lg:text-7xl tracking-tight text-foreground leading-[1.02]"
          >
            <span className="block">Meet people.</span>
            <span className="block">Build work.</span>
            <span className="block italic">Own your record.</span>
            <span className="block">
              <span className="text-[#FF4DA6]">Get </span>
              <span className="text-[#FFB020]">paid.</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-base sm:text-lg text-foreground/80 font-medium max-w-2xl leading-relaxed"
          >
            Discover collaborators, join live Soundstages, build projects and grow your Creative
            Passport — with Thrive helping move the work forward.
          </motion.p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/auth?tab=signup" onClick={() => trackLandingCta("wedge", "hero_primary")}>
              <Button size="lg" className="font-semibold">
                Start your Passport
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/scout" onClick={() => trackLandingCta("wedge", "scout_cta")}>
              <Button size="lg" variant="ghost" className="font-semibold">
                Hiring creators?
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Founding row (truthful — replaces "25k creators" placeholder) */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full ring-2 ring-background bg-gradient-to-br from-primary/40 to-energy/40"
                />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Join the <span className="font-bold text-foreground">founding 135</span> creators building on ThriveIN
            </p>
          </div>

          {/* Thrive-noticed floating card */}
          <div className="mt-8 max-w-sm rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <BrandDots />
            <p className="mt-2 text-sm font-bold text-foreground">Thrive noticed</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sponsor proposal is overdue
            </p>
            <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Review <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────── 5-PILLAR STRIP ───────────── */}
      <div className="bg-card border-y border-border/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-4">
            <Pillar
              icon={<Search className="h-5 w-5" />}
              title="Discover"
              desc="Find people, opportunities, events and communities that fit your goals."
              tone="from-primary/20 to-primary/5"
            />
            <Pillar
              icon={<AudioLines className="h-5 w-5" />}
              title="Connect"
              desc="Meet online in Soundstages or in real life at events, showcases and more."
              tone="from-energy/20 to-energy/5"
            />
            <Pillar
              icon={<FolderKanban className="h-5 w-5" />}
              title="Build"
              desc="Turn conversations into Studios, tasks and projects. Thrive keeps it moving."
              tone="from-[#FF4DA6]/20 to-[#FF4DA6]/5"
            />
            <Pillar
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Credit"
              desc="Collect Stamps, co-signs and verified proof of work in your Passport."
              tone="from-[#FFB020]/20 to-[#FFB020]/5"
            />
            <Pillar
              icon={<DollarSign className="h-5 w-5" />}
              title="Earn"
              desc="Invoice, get paid and track receipts. The work paid off."
              tone="from-[#20D3C2]/20 to-[#20D3C2]/5"
            />
          </div>
        </div>
      </div>

      {/* ───────────── MEET THRIVE ───────────── */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <BrandDots />
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl tracking-tight text-foreground leading-[1.05]">
              Meet Thrive.
              <br />
              <span className="italic">Your Creative</span>
              <br />
              <span className="italic">Executive Producer.</span>
            </h2>
            <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
              Thrive helps move work forward. From the first hello to the final payment.
            </p>
          </div>

          <ul className="space-y-3 sm:pt-12">
            {[
              "Creates Studios",
              "Organizes tasks",
              "Finds collaborators",
              "Drafts proposals",
              "Tracks progress",
              "Remembers context",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm sm:text-base text-foreground font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ───────────── REAL WORK / TESTIMONIALS ───────────── */}
      <div className="bg-card border-y border-border/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl sm:text-5xl tracking-tight text-foreground leading-[1.05]">
            Real work. Real people.
            <br />
            <span className="text-[#FF4DA6] italic">Real impact.</span>
          </h2>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Quote
              text="Met an editor in a Soundstage. Two weeks later we shipped a campaign."
              name="Jada E."
              role="Filmmaker"
            />
            <Quote
              text="Thrive keeps my projects organized and my clients happy."
              name="Nigel S."
              role="Creative Director"
            />
            <Quote
              text="My Passport finally shows everything I've built. It opened doors."
              name="Sasha M."
              role="Producer"
            />
          </div>
        </div>
      </div>

      {/* ───────────── ONLINE OR IN THE ROOM ───────────── */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <h2 className="font-serif text-3xl sm:text-5xl tracking-tight text-foreground leading-[1.05]">
          Online or in the room.
          <br />
          You <span className="italic text-[#FF4DA6]">belong</span> here.
        </h2>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <SurfaceChip icon={<AudioLines className="h-4 w-4" />} label="Soundstages" />
          <SurfaceChip icon={<Users className="h-4 w-4" />} label="Events" />
          <SurfaceChip icon={<Sparkles className="h-4 w-4" />} label="Showcases" />
          <SurfaceChip icon={<FolderKanban className="h-4 w-4" />} label="Auditions" />
        </div>

        <Link to="/scout" className="inline-block mt-7" onClick={() => trackLandingCta("wedge", "explore_events")}>
          <Button size="lg" variant="outline" className="font-semibold">
            Explore events
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Social proof */}
      <SocialProofSection />

      {/* ───────────── FINAL CTA ───────────── */}
      <div
        className="container mx-auto max-w-3xl px-4 sm:px-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 9rem)" }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 sm:p-12 text-center">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          <div className="relative">
            <BrandDots />
            <h2 className="mt-3 font-serif text-2xl sm:text-4xl tracking-tight text-foreground mb-3 text-balance">
              Meet people. Build work. Own your record. Get paid.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
              Start your Creative Passport today. Free forever · No credit card.
            </p>
            <div className="max-w-md mx-auto mb-3">
              <div onClickCapture={() => trackLandingCta("wedge", "oauth_cta")}>
                <OAuthQuickButtons hideDivider />
              </div>
            </div>
            <Link
              to="/auth?tab=signup"
              onClick={() => trackLandingCta("wedge", "bottom_cta")}
              className="block w-full sm:inline-block sm:w-auto mt-2"
            >
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto font-semibold whitespace-normal h-auto min-h-12 py-3 px-5"
              >
                <Zap className="mr-2 h-5 w-5 shrink-0" />
                <span className="truncate">Get started</span>
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pillar = ({
  icon,
  title,
  desc,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: string;
}) => (
  <div className="flex flex-col">
    <div className="h-9 w-9 rounded-xl bg-background border border-border/60 flex items-center justify-center text-foreground/80">
      {icon}
    </div>
    <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>
    <div className={`mt-3 aspect-square rounded-xl bg-gradient-to-br ${tone} border border-border/40`} />
  </div>
);

const Quote = ({ text, name, role }: { text: string; name: string; role: string }) => (
  <div className="rounded-2xl border border-border/60 bg-background p-4">
    <p className="text-sm text-foreground leading-relaxed">"{text}"</p>
    <div className="mt-3 flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/40 to-energy/40" />
      <div>
        <p className="text-xs font-bold text-foreground">{name}</p>
        <p className="text-[10px] text-muted-foreground">{role}</p>
      </div>
    </div>
  </div>
);

const SurfaceChip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80">
    <span className="text-primary">{icon}</span>
    {label}
  </span>
);
