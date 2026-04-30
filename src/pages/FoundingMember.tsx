import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { Star, CheckCircle2, ArrowLeft, Trophy, Calendar } from "lucide-react";
import { useFoundingMemberProgress } from "@/hooks/useFoundingMemberProgress";
import { FOUNDING_QUESTS, foundingDeadlineLabel, foundingDaysLeft } from "@/lib/foundingMember";
import { useAuth } from "@/hooks/useAuth";

const QUEST_CTA: Record<string, { label: string; to: string }> = {
  claim_profile: { label: "Verify profile", to: "/profile" },
  log_credits: { label: "Add a credit", to: "/profile" },
  invite_signups: { label: "Invite friends", to: "/profile?tab=invite" },
};

export default function FoundingMember() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, progress, completedCount, allComplete, badgeAwarded } = useFoundingMemberProgress();

  const total = FOUNDING_QUESTS.length;
  const pct = Math.round((completedCount / total) * 100);
  const deadline = foundingDeadlineLabel();
  const daysLeft = foundingDaysLeft();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Founding Member — ThriveIN"
        description="Earn one of 100 Founding Member badges by completing 3 short milestones."
      />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <Card className="p-6 mb-4 bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Star className="h-6 w-6 text-primary" fill="currentColor" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                Limited · 100 spots
              </p>
              <h1 className="text-2xl font-bold leading-tight">Founding Member</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Earn a permanent badge for shaping ThriveIN early. Active members only.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 border border-border rounded-full px-2.5 py-1">
                <Calendar className="h-3 w-3" />
                Closes {deadline} · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              <span className="text-muted-foreground">
                {completedCount} of {total} completed
              </span>
              <span className="text-foreground">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </Card>

        {/* Celebration / call to action */}
        {allComplete ? (
          <Card className="p-5 mb-4 border-primary/40 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-base">You earned it.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {badgeAwarded
                    ? "Your Founding Member badge is now on your profile. Wear it well."
                    : "All 3 milestones complete — your badge will appear on your profile shortly."}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(user ? "/profile" : "/auth")}
                >
                  View my profile
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground px-1 mb-3">
            Complete all 3 to earn your Founding Member badge before {deadline}.
          </p>
        )}

        {/* Quest cards */}
        <div className="space-y-3">
          {FOUNDING_QUESTS.map((quest, i) => {
            const p = progress[quest.key];
            const cta = QUEST_CTA[quest.key];
            const questPct = Math.round((p.current / p.target) * 100);
            return (
              <Card
                key={quest.key}
                className={`p-4 transition-colors ${
                  p.completed ? "border-primary/40 bg-primary/[0.04]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                      p.completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.completed ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-snug">{quest.title}</p>
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          p.completed ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {p.current}/{p.target}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{quest.description}</p>
                    <div className="mt-2.5">
                      <Progress value={questPct} className="h-1.5" />
                    </div>
                    {!p.completed && cta && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 h-8 text-xs"
                        onClick={() => navigate(cta.to)}
                      >
                        {cta.label}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {loading && (
          <p className="text-xs text-muted-foreground text-center mt-4">Checking your progress…</p>
        )}
      </div>
    </div>
  );
}
