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
            Your next gig &amp; collaborator,
            <span className="text-muted-foreground"> in one feed.</span>
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

          {/* Hire-side entry — Talent Scout (the AI talent finder) */}
          <Link
            to="/talent-finder"
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open Talent Scout — find creators to hire"
          >
            <UserSearch className="h-3.5 w-3.5" />
            Hiring? Open Talent Scout
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {tab === "scouted" && <ScoutedGigsSection />}
        {tab === "marketplace" && <OpportunitiesFeed />}
        {tab === "match" && (
          user ? (
            <SwipeFeature onMatch={handleMatch} />
          ) : (
            <GuestSwipePreview />
          )
        )}
      </div>

      {matchedUser && (
        <MatchCelebrationDialog
          open={showMatchDialog}
          onOpenChange={setShowMatchDialog}
          matchedUser={matchedUser}
          onSendMessage={() => navigate(`/messages?user=${matchedUser.userId}`)}
        />
      )}
    </div>
  );
};

export default Scout;
