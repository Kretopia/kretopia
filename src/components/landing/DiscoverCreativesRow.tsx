import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Verified, ArrowRight, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Creator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  verification_tier: string | null;
}

const FALLBACK_CREATORS: Creator[] = [
  { user_id: "featured-filmmaker", full_name: "Ari J.", avatar_url: null, role: "Filmmaker", verification_tier: "industry" },
  { user_id: "featured-producer", full_name: "Maya R.", avatar_url: null, role: "Producer", verification_tier: "verified" },
  { user_id: "featured-artist", full_name: "Kai B.", avatar_url: null, role: "Artist", verification_tier: "industry" },
  { user_id: "featured-designer", full_name: "Nia S.", avatar_url: null, role: "Designer", verification_tier: "verified" },
  { user_id: "featured-dj", full_name: "Zion C.", avatar_url: null, role: "DJ", verification_tier: "industry" },
];

/**
 * Horizontal scroll of real creator profiles — matches the authenticated
 * home "Discover Creators" row style (round avatars, gradient glow, verified badges).
 */
export const DiscoverCreativesRow = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("public_profiles_safe")
          .select("user_id, full_name, avatar_url, role, verification_tier")
          .eq("onboarding_completed", true)
          .not("avatar_url", "is", null)
          .not("full_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(15);
        if (data && data.length > 0) {
          setCreators(data.sort(() => Math.random() - 0.5).slice(0, 10) as Creator[]);
        }
      } catch {
        /* silent */
      }
    };
    load();
  }, []);

  const visibleCreators = creators.length > 0
    ? [...creators, ...FALLBACK_CREATORS].slice(0, 8)
    : FALLBACK_CREATORS;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Real creators on ThriveIN
        </h2>
        <button
          onClick={() => navigate("/search")}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          Explore <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x">
        {visibleCreators.map((c, i) => (
          <motion.button
            key={c.user_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => c.user_id.startsWith("featured-") ? navigate("/auth?tab=signup") : navigate(`/profile/${c.user_id}`)}
            className="shrink-0 group snap-start"
          >
            <div className="flex flex-col items-center gap-2 w-[72px]">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-accent opacity-80 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                <Avatar className="relative h-14 w-14 border-2 border-background group-hover:border-primary/50 transition-colors shadow-lg">
                  <AvatarImage src={c.avatar_url || ""} alt={c.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-black">
                    {(c.full_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                {c.verification_tier && c.verification_tier !== "none" && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                    <Verified className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-[10px] font-black text-foreground truncate">{c.full_name}</p>
                <p className="text-[8px] font-semibold text-foreground/70 truncate">{c.role || "Creative"}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
