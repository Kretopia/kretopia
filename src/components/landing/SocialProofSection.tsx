import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Link2, Award, MapPin, Sparkles, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PublicStats {
  stats: {
    creators: number;
    connections: number;
    credits: number;
    gigs: number;
    events: number;
    circles: number;
    projects: number;
    countries: number;
  };
  topLocations: { location: string; count: number }[];
  topRoles: { role: string; count: number }[];
  generatedAt: string;
}

const formatNum = (n: number) => n.toLocaleString();

export const SocialProofSection = () => {
  const [data, setData] = useState<PublicStats | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("public-stats");
        if (!error && mounted && data) setData(data as PublicStats);
      } catch {
        // silent
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!data) return null;

  const { stats, topLocations, topRoles } = data;

  const headlineStats = [
    { icon: Users, label: "Verified creators", value: formatNum(stats.creators) },
    { icon: Link2, label: "Verified connections", value: formatNum(stats.connections) },
    { icon: Award, label: "Credits logged", value: formatNum(stats.credits) },
    { icon: Globe2, label: "Countries", value: formatNum(stats.countries) },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 bg-gradient-to-b from-background via-background to-muted/20 border-y border-border/40">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <Badge variant="outline" className="mb-4 gap-1.5 border-primary/30 text-primary">
            <Sparkles className="w-3 h-3" />
            Live network signal
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
            Built by creators. <span className="text-primary">Proven by data.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Real numbers, updated automatically from the network. No vanity metrics, no inflation.
          </p>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          {headlineStats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6 text-center hover:border-primary/40 transition-colors"
            >
              <s.icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl sm:text-4xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1 font-medium">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Locations + Roles */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Top locations */}
          <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Where creators are joining from</h3>
            </div>
            {topLocations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topLocations.map((loc) => (
                  <Badge
                    key={loc.location}
                    variant="secondary"
                    className="text-xs sm:text-sm py-1.5 px-3 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {loc.location}
                    <span className="ml-1.5 text-primary font-bold">{loc.count}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Mapping early creators…</p>
            )}
          </div>

          {/* Role mix */}
          <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Who's already on ThriveIN</h3>
            </div>
            {topRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topRoles.map((r) => (
                  <Badge
                    key={r.role}
                    variant="secondary"
                    className="text-xs sm:text-sm py-1.5 px-3 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {r.role}
                    <span className="ml-1.5 text-primary font-bold">{r.count}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Mapping role mix…</p>
            )}
          </div>
        </div>

        {/* Footer microcopy */}
        <p className="text-center text-[11px] text-muted-foreground/70 mt-8">
          Updated live · Excludes internal accounts · Last refresh {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>
    </section>
  );
};
