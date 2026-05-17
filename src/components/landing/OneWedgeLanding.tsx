import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  Users,
  AudioLines,
  FolderKanban,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { trackLandingCta } from "@/hooks/useLandingVariant";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onSearchSubmit: (q: string) => void;
}

interface FoundingCreator {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const OneWedgeLanding = ({ onSearchSubmit }: Props) => {
  const [creators, setCreators] = useState<FoundingCreator[]>([]);
  const [creatorCount, setCreatorCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Avatars: query the anon-readable `public_profiles_safe` view (RLS-safe).
        // Don't require avatar_url — fall back to initials so the row never collapses to 1.
        const avatarsP = supabase
          .from("public_profiles_safe")
          .select("user_id, full_name, avatar_url")
          .eq("onboarding_completed", true)
          .not("full_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(12);

        // Counts: use the service-role public-stats edge fn (anon SELECT is blocked by RLS)
        const statsP = supabase.functions.invoke("public-stats");

        const [{ data: rows }, { data: statsData }] = await Promise.all([avatarsP, statsP]);
        if (!alive) return;
        if (rows) {
          // Prefer avatars first, then fill the rest with initials-only rows up to 6.
          const withAvatar = (rows as FoundingCreator[]).filter((r) => r.avatar_url);
          const withoutAvatar = (rows as FoundingCreator[]).filter((r) => !r.avatar_url);
          setCreators([...withAvatar, ...withoutAvatar].slice(0, 6));
        }
        const c = (statsData as any)?.stats?.creators;
        if (typeof c === "number") setCreatorCount(c);
      } catch {
        /* silent — landing must never crash */
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="bg-background">
      {/* ───────────── HERO ───────────── */}
      <div className="relative overflow-hidden">
        <div className="relative container mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-16 pb-14">
          {/* Headline — all ink, no spectrum word-colors */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-serif text-[2.5rem] sm:text-6xl lg:text-7xl tracking-tight text-foreground leading-[1.02]"
          >
            <span className="block">Meet people.</span>
            <span className="block">Build work.</span>
            <span className="block italic">Own your <span className="text-[hsl(var(--signal-teal))]">record</span>.</span>
            <span className="block">Get paid.</span>
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
            <Link to="/auth?tab=signin" onClick={() => trackLandingCta("wedge", "hero_signin")}>
              <Button size="lg" variant="ghost" className="font-semibold">
                Already a member? Sign in
              </Button>
            </Link>
          </div>

          {/* Real creators + live count */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex -space-x-2">
              {(creators.length ? creators.slice(0, 5) : Array.from({ length: 5 })).map((c: any, i) => {
                const initial = (c?.full_name ?? "").trim().charAt(0).toUpperCase();
                return (
                  <div
                    key={c?.user_id ?? i}
                    className="h-9 w-9 rounded-full ring-2 ring-background bg-muted overflow-hidden flex items-center justify-center text-[11px] font-bold text-foreground/70"
                    title={c?.full_name ?? undefined}
                  >
                    {c?.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt={c.full_name ?? "Creator"}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initial || ""
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Join{" "}
              <span className="font-bold text-foreground">
                {creatorCount !== null ? creatorCount.toLocaleString() : "…"}
              </span>{" "}
              creators building on ThriveIN
            </p>
          </div>
        </div>
      </div>

      {/* ───────────── 4-PILLAR STRIP (even grid: 2×2 mobile, 4×1 desktop) ───────────── */}
      <div className="bg-card border-y border-border/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <Pillar
              icon={<Search className="h-5 w-5" />}
              title="Discover"
              desc="Find people, opportunities, events and communities that fit your goals."
            />
            <Pillar
              icon={<AudioLines className="h-5 w-5" />}
              title="Connect"
              desc="Meet online in Soundstages or in real life at events, showcases and more."
            />
            <Pillar
              icon={<FolderKanban className="h-5 w-5" />}
              title="Build"
              desc="Turn conversations into Studios, tasks and projects. Thrive keeps it moving."
            />
            <Pillar
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Credit & Earn"
              desc="Collect Stamps, co-signs, invoice clients and track receipts in your Passport."
            />
          </div>
        </div>
      </div>

      {/* ───────────── MEET THRIVE (even 6-item list) ───────────── */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--signal-teal))] font-semibold">
              Meet Thrive
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-5xl tracking-tight text-foreground leading-[1.05]">
              Your Creative
              <br />
              <span className="italic text-[hsl(var(--signal-teal))]">Executive Producer.</span>
            </h2>
            <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
              Thrive helps move work forward. From the first hello to the final payment.
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:pt-2">
            {[
              "Creates Studios",
              "Organizes tasks",
              "Finds collaborators",
              "Drafts proposals",
              "Tracks progress",
              "Remembers context",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[hsl(var(--signal-teal))]/15 text-[hsl(var(--signal-teal))] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm sm:text-base text-foreground font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ───────────── ONLINE OR IN THE ROOM (even 4 chips) ───────────── */}
      <div className="bg-card border-y border-border/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-16">
          <h2 className="font-serif text-3xl sm:text-5xl tracking-tight text-foreground leading-[1.05]">
            Online or in the room.
            <br />
            You <span className="italic text-[hsl(var(--signal-teal))]">belong</span> here.
          </h2>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SurfaceChip to="/events" icon={<AudioLines className="h-4 w-4" />} label="Soundstages" />
            <SurfaceChip to="/events" icon={<Users className="h-4 w-4" />} label="Events" />
            <SurfaceChip to="/events" icon={<FolderKanban className="h-4 w-4" />} label="Showcases" />
            <SurfaceChip to="/events" icon={<ShieldCheck className="h-4 w-4" />} label="Auditions" />
          </div>

          <Link to="/events" className="inline-block mt-8" onClick={() => trackLandingCta("wedge", "explore_events")}>
            <Button size="lg" variant="outline" className="font-semibold">
              Explore events
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Live network signal — real numbers, fixed-glitch */}
      <SocialProofSection />

      {/* ───────────── FINAL CTA ───────────── */}
      <div
        className="container mx-auto max-w-3xl px-4 sm:px-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 9rem)" }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-12 text-center">
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              Start your record
            </p>
            <h2 className="font-serif text-2xl sm:text-4xl tracking-tight text-foreground mb-3 text-balance">
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
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="flex flex-col">
    <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center text-foreground">
      {icon}
    </div>
    <p className="mt-4 text-base font-bold text-foreground">{title}</p>
    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);

const SurfaceChip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
    <span className="text-foreground/70">{icon}</span>
    {label}
  </span>
);
