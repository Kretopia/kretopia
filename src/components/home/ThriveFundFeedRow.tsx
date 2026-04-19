import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Rocket, Users } from "lucide-react";
import { useActiveCampaigns } from "@/hooks/useThriveFund";
import { Progress } from "@/components/ui/progress";

export const ThriveFundFeedRow = () => {
  const navigate = useNavigate();
  const { data: campaigns = [] } = useActiveCampaigns();

  if (!campaigns.length) return null;

  return (
    <section className="mb-8 scroll-mt-14">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          Back a Creator
        </h2>
        <Link to="/fund" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
        {campaigns.slice(0, 8).map((c, i) => {
          const pct = Math.min(
            100,
            Math.round((Number(c.total_raised) / Math.max(1, Number(c.goal_amount))) * 100)
          );
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000)
          );
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/fund/${c.slug}`)}
              className="shrink-0 w-[240px] snap-start text-left"
            >
              <div className="rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md group">
                {c.cover_image_url ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={c.cover_image_url}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 flex items-center justify-center">
                    <Rocket className="h-7 w-7 text-primary/40" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                    {c.title}
                  </p>
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold text-primary">{pct}% funded</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" /> {c.backer_count}
                    </span>
                    <span>{daysLeft}d left</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
