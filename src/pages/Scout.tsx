import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { Radar, Store, UserSearch, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Tab = "scouted" | "marketplace" | "talent";

const TABS: { id: Tab; label: string; icon: typeof Radar; hint: string }[] = [
  { id: "scouted", label: "For You", icon: Radar, hint: "Real gigs scouted from across the web" },
  { id: "marketplace", label: "Open Gigs", icon: Store, hint: "All open gigs on ThriveIN" },
  { id: "talent", label: "Talent", icon: UserSearch, hint: "Scout creators to hire" },
];

/**
 * Scout — gigs and talent only. Two purposes: find gigs to work on,
 * find creators to hire. People-discovery for collaboration lives in /circle.
 */
const Scout = () => {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as Tab) || "scouted";
  const [tab, setTab] = useState<Tab>(initial);

  const switchTab = (next: Tab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Scout — Find your next gig & collaborator | ThriveIN"
        description="One feed for the gigs and people that fit your work — scouted from across the web and curated by Thrive."
      />

      {/* Calm header */}
      <header className="border-b border-border/60 bg-background pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto max-w-5xl px-4 pt-7 pb-4 sm:pt-9 sm:pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Scout
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.05]">
            Gigs &amp; talent,
            <span className="text-muted-foreground"> scouted for you.</span>
          </h1>

          {/* Segmented tabs */}
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
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Quick links */}
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <Link
              to="/circle"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Find collaborators in Circle"
            >
              Looking for collaborators? Open Circle
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {tab === "scouted" && <ScoutedGigsSection />}
        {tab === "marketplace" && <OpportunitiesFeed />}
        {tab === "talent" && (
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-accent/5 p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <UserSearch className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Scout creators to hire</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Describe the brief — Thrive surfaces the right creators, with proof,
                rates, and a one-tap intro.
              </p>
            </div>
            <Link
              to="/talent-finder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Open Talent Scout
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scout;
