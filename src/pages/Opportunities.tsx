import { useState } from "react";
import { SEO } from "@/components/SEO";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { Radar, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorialPageHero } from "@/components/kretopia/EditorialPageHero";

type Tab = "scouted" | "marketplace";

const Opportunities = () => {
  const [tab, setTab] = useState<Tab>("scouted");

  return (
    <div className="dark min-h-screen pb-20 bg-background">
      <SEO
        title="Gigs — Find Creative Work | Kretopia"
        description="Browse and apply for creative gigs — paid jobs, collaborations, and barter opportunities across film, music, fashion, events and more."
      />

      <EditorialPageHero
        kicker="Live gigs"
        title="Gigs."
        accentTitle="Find your next one."
        subtitle="Real gigs scouted from across the web, plus the Kretopia marketplace — one feed."
      >
        {/* Segmented toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm">
          <button
            onClick={() => setTab("scouted")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
              tab === "scouted" ? "text-white bg-[hsl(var(--energy))]" : "text-white/55 hover:text-white",
            )}
          >
            <Radar className="h-3.5 w-3.5" />
            Scouted for you
          </button>
          <button
            onClick={() => setTab("marketplace")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
              tab === "marketplace" ? "bg-white/10 text-white" : "text-white/55 hover:text-white",
            )}
          >
            <Store className="h-3.5 w-3.5" />
            Marketplace
          </button>
        </div>
      </EditorialPageHero>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {tab === "scouted" ? <ScoutedGigsSection /> : <OpportunitiesFeed />}
      </div>
    </div>
  );
};

export default Opportunities;
