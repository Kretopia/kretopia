import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StarterStep {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

/**
 * Shown to users in their first 7 days post-onboarding.
 * 4-step starter checklist that pulls them into actual platform actions.
 */
export const NewMemberStarterCard = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState<StarterStep[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const dismissedAt = localStorage.getItem(`starter-dismissed-${user.id}`);
    if (dismissedAt) {
      setDismissed(true);
      return;
    }

    const load = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_at, onboarding_completed, bio, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile?.onboarding_completed) return;

        const ageMs = Date.now() - new Date(profile.created_at).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays > 7) return;

        const [appliedRes, msgRes, eventRes] = await Promise.all([
          supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("applicant_id", user.id),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("sender_id", user.id),
          supabase
            .from("jam_participants")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        const built: StarterStep[] = [
          {
            id: "profile",
            label: "Add bio + photo",
            href: "/profile/edit",
            done: !!(profile.bio && profile.avatar_url),
          },
          {
            id: "apply",
            label: "Apply to your first gig",
            href: "/opportunities",
            done: (appliedRes.count ?? 0) > 0,
          },
          {
            id: "message",
            label: "Send your first message",
            href: "/circle",
            done: (msgRes.count ?? 0) > 0,
          },
          {
            id: "event",
            label: "Join an event near you",
            href: "/nearby",
            done: (eventRes.count ?? 0) > 0,
          },
        ];

        // Only show if at least one step still incomplete
        if (built.some((s) => !s.done)) {
          setSteps(built);
          setShow(true);
        }
      } catch (e) {
        console.error("[NewMemberStarterCard]", e);
      }
    };

    load();
  }, [user]);

  if (!show || dismissed) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  const handleDismiss = () => {
    if (user) localStorage.setItem(`starter-dismissed-${user.id}`, new Date().toISOString());
    setDismissed(true);
  };

  return (
    <div className={`relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-energy/[0.05] p-5 ${className}`}>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss starter card"
      >
        Dismiss
      </button>

      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">Your first week starter</p>
          <p className="text-[11px] text-muted-foreground">{doneCount} of {steps.length} done · {pct}%</p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-3 mb-4">
        <div
          className="h-full bg-gradient-to-r from-primary to-energy transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              to={s.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors ${
                s.done
                  ? "bg-success/10 text-muted-foreground line-through"
                  : "bg-card hover:bg-muted/60 text-foreground border border-border/40"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 font-medium">{s.label}</span>
              {!s.done && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
