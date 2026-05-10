import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Verified, ArrowRight, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Creator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  verification_tier: string | null;
}

const PAGE_SIZE = 8;
const ROTATE_MS = 6000;

/**
 * Horizontal scroll of REAL creator profiles for the landing page.
 * Pulls from public_profiles_safe (anon-readable, security_definer view)
 * and rotates the visible window every few seconds so the row feels alive.
 */
export const DiscoverCreativesRow = () => {
  const [pool, setPool] = useState<Creator[]>([]);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("public_profiles_safe")
          .select("user_id, full_name, avatar_url, role, verification_tier")
          .not("avatar_url", "is", null)
          .not("full_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(60);
        if (data && data.length > 0) {
          // shuffle once on mount so order varies per visit
          setPool([...data].sort(() => Math.random() - 0.5) as Creator[]);
        }
      } catch {
        /* silent */
      }
    })();
  }, []);

  // rotate the visible window every ROTATE_MS
  useEffect(() => {
    if (pool.length <= PAGE_SIZE) return;
    const t = setInterval(() => setPage((p) => p + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, [pool.length]);

  const visible = useMemo(() => {
    if (pool.length === 0) return [];
    const start = (page * PAGE_SIZE) % pool.length;
    const out: Creator[] = [];
    for (let i = 0; i < PAGE_SIZE; i++) out.push(pool[(start + i) % pool.length]);
    return out;
  }, [pool, page]);

  if (visible.length === 0) return null;

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
        <AnimatePresence mode="popLayout">
          {visible.map((c, i) => (
            <motion.button
              key={`${page}-${c.user_id}`}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ delay: i * 0.03, duration: 0.35 }}
              onClick={() => navigate(`/profile/${c.user_id}`)}
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
                  <p className="text-[10px] font-black text-foreground truncate capitalize">{c.full_name}</p>
                  <p className="text-[9px] font-semibold text-foreground/70 truncate">{c.role || "Creative"}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* See more creators CTA at end of row */}
        <button
          onClick={() => navigate("/search")}
          className="shrink-0 snap-start group"
        >
          <div className="flex flex-col items-center gap-2 w-[72px]">
            <div className="relative h-14 w-14 rounded-full border-2 border-dashed border-primary/60 bg-primary/5 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-colors">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[10px] font-black text-primary text-center leading-tight">See<br/>more</p>
          </div>
        </button>
      </div>

      {/* Bottom full-width CTA */}
      <button
        onClick={() => navigate("/search")}
        className="w-full mt-1 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-xs font-bold text-primary flex items-center justify-center gap-1.5"
      >
        Browse all creators on ThriveIN <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
