import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { SurfaceProactiveCards } from "@/components/agent/SurfaceProactiveCards";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { ShortlistedGigs } from "@/components/opportunity/ShortlistedGigs";
import { Radar, Store, UserSearch, ArrowRight, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeatureHeader } from "@/components/ui/feature-header";

type Tab = "scouted" | "shortlist" | "marketplace";

const TABS: { id: Tab; label: string; icon: typeof Radar; hint: string }[] = [
  { id: "scouted", label: "For You", icon: Radar, hint: "Real gigs scouted from across the web" },
  { id: "shortlist", label: "Shortlist", icon: Bookmark, hint: "Gigs you saved for later" },
  { id: "marketplace", label: "Open Gigs", icon: Store, hint: "All open gigs on Kretopia" },
];

/**
 * Scout — gigs and talent only. Two purposes: find gigs to work on,
 * find creators to hire. People-discovery for collaboration lives in /circle.
 */
const Scout = () => {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const initial = TABS.some((t) => t.id === requestedTab) ? (requestedTab as Tab) : "scouted";
  const contextQuery = params.get("q") || "";
  const [tab, setTab] = useState<Tab>(initial);

  const switchTab = (next: Tab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };


  return (
    <div className="accent-scout min-h-screen bg-background pb-24">
      <SEO
        title="Scout — Find your next gig & collaborator | Kretopia"
        description="One feed for the gigs and people that fit your work — scouted from across the web and curated by Kreto."
      />

      {/* Calm header */}
      <header className="border-b border-border/60 bg-background pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto max-w-5xl px-4">
          <FeatureHeader eyebrow="Scout">
            Gigs &amp; talent,{" "}
            <span className="italic text-[hsl(var(--signal-teal))]">scouted</span>
            <span className="text-foreground/60"> for you.</span>
          </FeatureHeader>

          {/* Segmented tabs — teal outline on active */}
          <div
            role="tablist"
            aria-label="Scout sections"
            className="mt-6 inline-flex items-center gap-1 p-1 rounded-full border border-border bg-card"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  aria-label={t.hint}
                  onClick={() => switchTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                    active
                      ? "bg-background text-[hsl(var(--signal-teal))] shadow-sm ring-1 ring-[hsl(var(--signal-teal))]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", active && "text-[hsl(var(--signal-teal))]")} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Secondary navigation — deliberately not styled as tabs: these leave the page */}
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <Link
              to="/circle"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Find collaborators in Circle"
            >
              Looking for collaborators? Open Circle
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to={contextQuery ? `/talent-finder?q=${encodeURIComponent(contextQuery)}` : "/talent-finder"}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open Talent Scout to hire talent"
            >
              <UserSearch className="h-3 w-3" />
              Hiring? Open Talent Scout
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {contextQuery && (
          <div className="mb-4 rounded-xl border border-[hsl(var(--accent-scout))]/30 bg-[hsl(var(--accent-scout))]/5 p-3 text-xs flex items-start gap-2">
            <Radar className="h-3.5 w-3.5 mt-0.5 text-[hsl(var(--accent-scout))] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">From your Studio:</p>
              <p className="text-muted-foreground truncate">{contextQuery}</p>
            </div>
          </div>
        )}
        <SurfaceProactiveCards surface="scout" className="px-0 mb-4" />
        {tab === "scouted" && <ScoutedGigsSection />}
        {tab === "shortlist" && <ShortlistedGigs />}
        {tab === "marketplace" && <OpportunitiesFeed />}
      </div>
    </div>
  );
};

export default Scout;
