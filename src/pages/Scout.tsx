import { useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { SwipeFeature } from "@/components/swipe";
import { GuestSwipePreview } from "@/components/swipe/GuestSwipePreview";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { useAuth } from "@/hooks/useAuth";
import { Radar, Store, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "match" | "scouted" | "marketplace";

const TABS: { id: Tab; label: string; icon: typeof Radar; hint: string }[] = [
  { id: "scouted", label: "For You", icon: Radar, hint: "Real gigs scouted across the web" },
  { id: "match", label: "People", icon: Sparkles, hint: "Creators to collaborate with" },
  { id: "marketplace", label: "Open", icon: Store, hint: "All open gigs on ThriveIN" },
];

/**
 * Scout — the unified intelligent discovery surface.
 * Replaces the old /opportunities + /circle split. People + scouted gigs +
 * marketplace gigs in one calm shell. Existing routes still work; this is
 * just the new front door.
 */
const Scout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as Tab) || "scouted";
  const [tab, setTab] = useState<Tab>(initial);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  const handleMatch = useCallback((u: { name: string; avatar: string; role: string; userId: string }) => {
    setMatchedUser(u);
    setShowMatchDialog(true);
  }, []);

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
        />
      )}
    </div>
  );
};

export default Scout;
