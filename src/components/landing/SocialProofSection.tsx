import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Link2, Award, Globe2, Sparkles } from "lucide-react";
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

  const { stats } = data;

  const headlineStats = [
    { icon: Users, label: "Verified creators", value: formatNum(stats.creators) },
    { icon: Link2, label: "Verified connections", value: formatNum(stats.connections) },
    { icon: Award, label: "Credits logged", value: formatNum(stats.credits) },
    { icon: Globe2, label: "Countries", value: formatNum(stats.countries) },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 border-y border-border/40">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <Badge variant="outline" className="mb-4 gap-1.5 border-accent/40 text-accent bg-accent/5">
            <Sparkles className="w-3 h-3" />
            Live network signal
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3 text-foreground">
            Built by creators.{" "}
            <span className="text-accent" style={{ textShadow: "0 0 24px hsl(var(--accent) / 0.45)" }}>
              Proven by data.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Real numbers from the network — updated automatically. No vanity metrics.
          </p>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {headlineStats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6 text-center hover:border-accent/40 transition-colors"
            >
              <s.icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">{s.value}</p>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1 font-medium">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Footer microcopy */}
        <p className="text-center text-[11px] text-muted-foreground/70 mt-8">
          Updated live · Excludes internal accounts
        </p>
      </div>
    </section>
  );
};
