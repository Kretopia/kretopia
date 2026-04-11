import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Verified, ArrowRight, MapPin } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface Creator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  verification_tier: string | null;
}

/**
 * Horizontal scroll of real creator profiles shown under the search bar.
 * Replaces the old single-featured-profile card with browsable social proof.
 */
export const DiscoverCreativesRow = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role, location, verification_tier")
        .eq("onboarding_completed", true)
        .not("avatar_url", "is", null)
        .not("full_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(15);
      if (data && data.length > 0) {
        setCreators(data.sort(() => Math.random() - 0.5).slice(0, 10));
      }
    };
    load();
  }, []);

  if (creators.length < 2) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[110px] h-[130px] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-semibold">
          Discover Creatives
        </p>
        <button
          onClick={() => navigate("/search")}
          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
        >
          View all <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
        {creators.map((c) => (
          <button
            key={c.user_id}
            onClick={() => navigate(`/profile/${c.user_id}`)}
            className="shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all w-[100px] group"
          >
            <Avatar className="h-12 w-12 border-2 border-primary/15 group-hover:border-primary/40 transition-colors">
              <AvatarImage src={c.avatar_url || ""} alt={c.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {c.full_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center min-w-0 w-full">
              <div className="flex items-center justify-center gap-0.5">
                <p className="text-[11px] font-semibold text-foreground truncate">{c.full_name}</p>
                {c.verification_tier && c.verification_tier !== "none" && (
                  <Verified className="h-3 w-3 text-primary shrink-0" />
                )}
              </div>
              <p className="text-[9px] text-muted-foreground truncate">{c.role || "Creative"}</p>
              {c.location && (
                <p className="text-[8px] text-muted-foreground/60 truncate flex items-center justify-center gap-0.5 mt-0.5">
                  <MapPin className="h-2 w-2" /> {c.location}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
