import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, MapPin, ArrowRight, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Gig {
  id: string;
  title: string;
  type: string | null;
  location: string | null;
  compensation: string | null;
  created_at: string;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const typeLabel = (t?: string | null) => {
  const v = (t || "").toLowerCase();
  if (v.includes("barter")) return "Barter";
  if (v.includes("collab")) return "Collab";
  return "Paid";
};

/**
 * Live Gigs strip — surfaces 3 real opportunities on the landing page
 * to drive intent-based signups via /auth?intent=gigs&next=/opportunities/:id
 */
export const LiveGigsStrip = () => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("id, title, type, location, compensation, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      setGigs((data as Gig[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading || gigs.length === 0) return null;

  return (
    <section className="border-y border-border/50 bg-cinematic">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-energy" />
            <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-foreground">
              Live Gigs
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 text-[10px] font-bold uppercase tracking-wider text-energy">
              <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
              Hiring now
            </span>
          </div>
          <Link
            to="/auth?tab=signup&intent=gigs&next=/opportunities"
            className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1"
          >
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {gigs.map((g) => (
            <Link
              key={g.id}
              to={`/auth?tab=signup&intent=gigs&next=${encodeURIComponent(`/opportunities/${g.id}`)}`}
              className="group relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-4 hover:border-primary/40 hover:bg-card transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-primary/30 text-primary bg-primary/5">
                  {typeLabel(g.type)}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{timeAgo(g.created_at)}</span>
              </div>
              <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                {g.title}
              </h3>
              <div className="space-y-1 mb-3">
                {g.location && (
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {g.location}
                  </p>
                )}
                {g.compensation && (
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {g.compensation}
                  </p>
                )}
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-energy group-hover:gap-2 transition-all">
                Apply <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
