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

  if (creators.length < 2) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 flex flex-col items-center gap-2 w-[72px]">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
            <div className="h-2 w-12 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Discover Creators
        </h2>
        <button
          onClick={() => navigate("/search")}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          Explore <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x">
        {creators.map((c, i) => (
          <motion.button
            key={c.user_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(`/profile/${c.user_id}`)}
            className="shrink-0 group snap-start"
          >
            <div className="flex flex-col items-center gap-2 w-[72px]">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                <Avatar className="relative h-14 w-14 border-2 border-border group-hover:border-primary/50 transition-colors shadow-sm">
                  <AvatarImage src={c.avatar_url || ""} alt={c.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
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
                <p className="text-[10px] font-semibold text-foreground truncate">{c.full_name}</p>
                <p className="text-[8px] text-muted-foreground truncate">{c.role || "Creative"}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
