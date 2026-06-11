import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/ui/page-header";
import { Compass } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase, Radio } from "lucide-react";
import { SwipeFeature } from "@/components/swipe";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { CuratedStagesRail } from "@/components/circle/CuratedStagesRail";
import { SoundStagesRail } from "@/components/circle/SoundStagesRail";
import { LiveCallsPanel } from "@/components/circle/LiveCallsPanel";
import { useNavigate } from "react-router-dom";

type Tab = "people" | "opps" | "live";
const VALID: Tab[] = ["people", "opps", "live"];

/**
 * Discover — single hub for People (Match), Opportunities (Scout), Live (Stages).
 * Splits live stages from match (was tangled on /circle).
 */
export default function Discover() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initial = (params.get("tab") as Tab) || "people";
  const tab: Tab = useMemo(() => (VALID.includes(initial) ? initial : "people"), [initial]);

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO
        title="Discover — People, Opportunities, Live | ThriveIN"
        description="Meet collaborators, find gigs, and walk on stage — all in one feed."
      />
      <header className="border-b border-border/60 bg-background pt-[env(safe-area-inset-top)] px-4 py-3">
        <h1 className="text-xl font-bold font-serif">Discover</h1>
        <p className="text-xs text-muted-foreground">People · Opportunities · Live</p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
        <div className="sticky top-0 z-20 bg-background border-b border-border/60 px-3 py-2">
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="people" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> People
            </TabsTrigger>
            <TabsTrigger value="opps" className="gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" /> Opportunities
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-1.5 text-xs">
              <Radio className="h-3.5 w-3.5" /> Live
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="people" className="mt-0 px-3 py-3 accent-match">
          <SwipeFeature />
        </TabsContent>

        <TabsContent value="opps" className="mt-0 px-3 py-3 accent-scout space-y-6">
          <ScoutedGigsSection />
          <OpportunitiesFeed />
        </TabsContent>

        <TabsContent value="live" className="mt-0 px-3 py-3 space-y-5">
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">On air now</h2>
            <SoundStagesRail onJoin={(s) => navigate(`/circle?stage=${s.id}`)} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Curated stages</h2>
            <CuratedStagesRail />
          </section>
          <LiveCallsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
