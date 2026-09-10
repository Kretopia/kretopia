import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TodayFocus } from "@/components/home/TodayFocus";
import { Momentum } from "@/components/home/Momentum";

/**
 * TodayDashboard — the highest-priority, most personal information for this
 * user, promoted to render immediately under TodayHeader so it's visible
 * without scrolling: the one thing to act on right now (TodayFocus), then
 * what's actually moving this week (Momentum). Both already pull real,
 * live data with no fabricated numbers -- this component's job is just to
 * put them first and make that "live" quality legible at a glance.
 */
export function TodayDashboard() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-0.5">
        <Radio className="h-3 w-3 animate-pulse" style={{ color: "hsl(var(--energy))" }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Live
        </span>
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: [0.2, 0.65, 0.3, 0.95] }}
      >
        <TodayFocus />
      </motion.div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.08, ease: [0.2, 0.65, 0.3, 0.95] }}
      >
        <Momentum />
      </motion.div>
    </div>
  );
}

export default TodayDashboard;
