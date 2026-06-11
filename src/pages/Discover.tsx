import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/ui/page-header";
import { Compass, Users, Briefcase, Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SwipeFeature } from "@/components/swipe";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { supabase } from "@/integrations/supabase/client";

type Tab = "people" | "opps";
const VALID: Tab[] = ["people", "opps"];

/**
 * Discover — daily-driver hub: People (Match) · Opportunities (Scout).
 * Live stages moved to /circle?tab=live (only surfaced here when something is actually on-air).
 * Legacy ?tab=live still redirects to /circle for bookmarks.
 */
export default function Discover() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const requested = params.get("tab");
  const tab: Tab = useMemo(() => (VALID.includes(requested as Tab) ? (requested as Tab) : "people"), [requested]);

  // Bookmark redirect: old /discover?tab=live → /circle?tab=live
  useEffect(() => {
    if (requested === "live") navigate("/circle?tab=live", { replace: true });
  }, [requested, navigate]);

  // Live-now pulse: only show the pill when stages are actually on-air.
  const [liveCount, setLiveCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { count } = await supabase
        .from("sound_stages")
        .select("id", { count: "exact", head: true })
        .eq("is_live", true);
      if (!cancelled) setLiveCount(count ?? 0);
    };
    check().catch(() => {});
    const ch = supabase
      .channel("discover-live-pulse")
      .on("postgres_changes", { event: "*", schema: "public", table: "sound_stages" }, () => {
        check().catch(() => {});
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, []);

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO
        title="Discover — People & Opportunities | ThriveIN"
        description="Meet collaborators and find gigs — all in one feed."
      />
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <PageHeader
          eyebrow="The Hub"
          title="Discover"
          subtitle="Meet collaborators. Find gigs. Move work forward."
          icon={Compass}
          size="sm"
        />

        {liveCount > 0 && (
          <button
            onClick={() => navigate("/circle?tab=live")}
            className="mt-3 w-full flex items-center gap-2.5 rounded-xl border border-[hsl(var(--signal-magenta))]/30 bg-[hsl(var(--signal-magenta))]/5 px-3 py-2.5 text-left hover:border-[hsl(var(--signal-magenta))]/60 transition-colors"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--signal-magenta))] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--signal-magenta))]" />
            </span>
            <Radio className="h-3.5 w-3.5 text-[hsl(var(--signal-magenta))]" />
            <span className="text-xs font-semibold flex-1">
              {liveCount} stage{liveCount === 1 ? "" : "s"} on air now
            </span>
            <span className="text-[11px] text-muted-foreground">Tap to join →</span>
          </button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
        <div className="sticky top-0 z-20 bg-background border-b border-border/60 px-3 py-2 mt-3">
          <TabsList className="w-full grid grid-cols-2 h-10">
            <TabsTrigger value="people" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> People
            </TabsTrigger>
            <TabsTrigger value="opps" className="gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" /> Opportunities
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="people" className="mt-0 px-3 py-3 accent-match space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/circle?browse=1')}>
              <LayoutGrid className="h-4 w-4" /> Browse creators
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/talent-finder')}>
              <Sparkles className="h-4 w-4" /> Talent Scout
            </Button>
          </div>
          <SwipeFeature />
        </TabsContent>

        <TabsContent value="opps" className="mt-0 px-3 py-3 accent-scout space-y-6">
          <OpportunitiesFeed />
          <ScoutedGigsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
