import { BadgeCheck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import type { Standing } from "@/lib/passport/standing";

interface Props {
  standing: Standing;
  /** When provided, the title becomes a link (owner view only). */
  manageHref?: string;
}

/**
 * Compact ribbon shown above the Passport hero. Communicates current
 * standing title + progress toward the next level. Designed to feel
 * earned, not gamey — no points, no XP, no badges.
 */
export const PassportHeroRibbon = ({ standing, manageHref }: Props) => {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border/60 shadow-sm">
      <BadgeCheck className="h-4 w-4 text-[hsl(var(--signal-teal))] shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight">{standing.title}</span>
          {standing.nextLevelTitle && (
            <span className="text-[11px] text-muted-foreground truncate">
              → {standing.nextLevelTitle}
            </span>
          )}
        </div>
        {standing.nextLevelTitle && (
          <Progress value={standing.progressPct} className="h-1 mt-1" />
        )}
      </div>
      {manageHref && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );

  if (manageHref) {
    return (
      <Link to={manageHref} className="block w-full" aria-label={`Standing: ${standing.title}`}>
        {inner}
      </Link>
    );
  }
  return <div aria-label={`Standing: ${standing.title}`}>{inner}</div>;
};
