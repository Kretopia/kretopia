import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Standing } from "@/lib/passport/standing";

interface Props {
  standing: Standing;
  className?: string;
}

/**
 * Home + Profile surface. Shows the user's current standing, the next
 * level, and three highest-leverage next actions. Hidden once the user
 * is at the top level with no actions left.
 */
export const LevelUpCard = ({ standing, className }: Props) => {
  if (!standing.nextLevelTitle && standing.nextActions.length === 0) return null;

  return (
    <Card className={`p-4 space-y-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--signal-amber))]" />
            <h3 className="text-sm font-semibold">Level up your Passport</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            You're a <span className="font-medium text-foreground">{standing.title}</span>
            {standing.nextLevelTitle && (
              <> — {100 - standing.progressPct}% to <span className="font-medium text-foreground">{standing.nextLevelTitle}</span></>
            )}.
          </p>
        </div>
      </div>

      {standing.nextLevelTitle && <Progress value={standing.progressPct} className="h-1.5" />}

      <ul className="space-y-1.5">
        {standing.nextActions.map((a) => (
          <li key={a.id}>
            <Link
              to={a.deeplink}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
              <span className="truncate">{a.label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};
