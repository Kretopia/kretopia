import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Link2, Award, Globe2, Sparkles, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { testimonials } from "@/data/testimonials";

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

  // Only show testimonial cards once we have 3+ real ones (no fake quotes)
  const showTestimonials = testimonials.length >= 3;

  return (
    <section className="relative py-16 sm:py-24 px-4 border-y border-border/40 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <Badge variant="outline" className="mb-4 gap-1.5 border-energy/40 text-energy bg-energy/5">
            <Sparkles className="w-3 h-3" />
            {showTestimonials ? "Creator stories" : "Live network signal"}
          </Badge>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-[-0.035em] leading-[1] text-foreground mb-5">
            {showTestimonials ? (
              <>Built by creators.<br /><span className="text-primary">Booking real work.</span></>
            ) : (
              <>Built by creators.<br /><span className="text-primary">Proven by data.</span></>
            )}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            {showTestimonials
              ? "Real creators. Real outcomes. No fake reviews."
              : "Real numbers from the network — updated automatically. No vanity metrics."}
          </p>
        </div>

        {showTestimonials ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.slice(0, 3).map((t) => (
              <article
                key={t.name}
                className="rounded-2xl border border-border/60 bg-card p-6 hover:border-energy/40 transition-colors"
              >
                <Quote className="h-5 w-5 text-energy/60 mb-3" />
                <p className="text-sm text-foreground leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {t.avatarUrl && <AvatarImage src={t.avatarUrl} alt={t.name} />}
                    <AvatarFallback className="text-xs">{t.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.role}{t.location ? ` · ${t.location}` : ""}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {headlineStats.map((s) => (
              <div
                key={s.label}
                className="relative rounded-2xl border border-border/60 bg-card p-5 sm:p-6 text-center hover:border-energy/40 transition-colors"
              >
                <s.icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-energy" />
                <p className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">{s.value}</p>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1 font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground/70 mt-8">
          Updated live · Excludes internal accounts
        </p>
      </div>
    </section>
  );
};
