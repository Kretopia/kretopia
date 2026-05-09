import { useState } from "react";
import { SEO } from "@/components/SEO";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { Briefcase, Radar, Store } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "scouted" | "marketplace";

const Opportunities = () => {
  const [tab, setTab] = useState<Tab>("scouted");

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Gigs — Find Creative Work | ThriveIN"
        description="Browse and apply for creative gigs — paid jobs, collaborations, and barter opportunities across film, music, fashion, events and more."
      />

      {/* Cinematic header */}
      <div className="relative border-b border-border/50 bg-cinematic overflow-hidden pt-[env(safe-area-inset-top)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-energy/40 to-transparent" />
        <div className="relative container mx-auto max-w-5xl px-4 pt-6 pb-5 sm:pt-8 sm:pb-7">
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
                Real gigs scouted from across the web, plus the ThriveIN marketplace.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-border bg-card/60 backdrop-blur px-3 py-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">All gigs · One feed</span>
            </div>
          </div>

          {/* Segmented toggle */}
          <div className="mt-5 inline-flex items-center gap-1 p-1 rounded-full border border-border bg-card/60 backdrop-blur">
            <button
              onClick={() => setTab("scouted")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "scouted"
                  ? "bg-energy text-energy-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Radar className="h-3.5 w-3.5" />
              Scouted for you
            </button>
            <button
              onClick={() => setTab("marketplace")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "marketplace"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Store className="h-3.5 w-3.5" />
              Marketplace
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {tab === "scouted" ? <ScoutedGigsSection /> : <OpportunitiesFeed />}
      </div>
    </div>
  );
};

export default Opportunities;
