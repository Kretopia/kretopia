import { SEO } from "@/components/SEO";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { Briefcase, Sparkles } from "lucide-react";

const Opportunities = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Gigs — Find Creative Work | ThriveIN"
        description="Browse and apply for creative gigs — paid jobs, collaborations, and barter opportunities across film, music, fashion, events and more."
      />

      {/* Cinematic header */}
      <div className="relative border-b border-border/50 bg-cinematic overflow-hidden pt-[env(safe-area-inset-top)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-energy/40 to-transparent" />
        <div className="relative container mx-auto max-w-5xl px-4 pt-6 pb-7 sm:pt-8 sm:pb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-energy mb-3 px-2.5 py-1 rounded-full border border-energy/30 bg-energy/[0.04]">
                <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
                Live gigs
              </p>
              <h1 className="text-3xl sm:text-5xl font-black tracking-[-0.035em] text-foreground leading-[0.95]">
                Gigs.<br />
                <span className="text-energy-glow">Find your next one.</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md">
                Paid jobs, collabs, and barter across every creative industry — film, music, fashion, events and more.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-border bg-card/60 backdrop-blur px-3 py-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">All gigs · One feed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-8">
        <ScoutedGigsSection />
        <div className="border-t border-border/50 pt-6">
          <h2 className="text-lg font-bold mb-3">Marketplace</h2>
          <OpportunitiesFeed />
        </div>
      </div>
    </div>
  );
};

export default Opportunities;
