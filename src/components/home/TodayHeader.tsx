import { Sparkles, MessageCircle, ListChecks, ChevronDown } from "lucide-react";
import { FeaturePageHeader } from "@/components/features/FeaturePageHeader";
import { KretoPresence } from "@/components/brand/KretoPresence";
import type { TutorialStep } from "@/components/landing/kretopia/FeatureTutorial";

const TODAY_TUTORIAL: TutorialStep[] = [
  { icon: Sparkles, title: "Tell Kreto what's next", body: "Type or speak what you're working on — Kreto routes it to a new workspace, a people search, a gig search, or a straight answer." },
  { icon: ListChecks, title: "Your Dashboard", body: "The one thing that matters most right now — an overdue task, a pending approval, or a fresh opportunity — plus what's actually moving, updated live." },
  { icon: ChevronDown, title: "What's next", body: "Filterable approvals, deadlines and discovery, organized into clear action blocks so you always know the next move." },
];

interface TodayHeaderProps {
  firstName?: string;
  /** Dynamic line under the title -- defaults to a generic Kreto nudge, but
   *  callers with something more specific to say (a fresh match, a pending
   *  approval) should pass it so the header feels alive, not static copy. */
  subtitle?: string;
}

/**
 * TodayHeader — title, Kreto's presence, and the two fastest ways to act
 * ("Draft outreach" / "Or just chat") without needing to reach for the full
 * composer below. Both quick actions hand off to the same event bus
 * ThrivePromptHero (TodayWhatsNext) and the Kreto copilot already listen on
 * -- "Draft outreach" pre-fills and submits a prompt via `thrive-prompt:fill`,
 * "Or just chat" opens the copilot via `thrive-copilot:open` -- so this stays
 * a thin, fast entry point instead of a second place that owns routing logic.
 */
export function TodayHeader({ firstName, subtitle }: TodayHeaderProps) {
  const draftOutreach = () => {
    window.dispatchEvent(
      new CustomEvent("thrive-prompt:fill", {
        detail: { prompt: "Draft outreach to a sponsor or brand", submit: true },
      }),
    );
  };
  const justChat = () => {
    window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: {} }));
  };

  return (
    <FeaturePageHeader
      eyebrow="Kreto · Today"
      title={firstName ? `${firstName},` : "Today,"}
      accentTitle="here's what moves you forward today."
      subtitle={subtitle || "Your Creative Passport is doing the work — want me to draft an outreach DM?"}
      tutorial={{ featureKey: "today", label: "How Today works", steps: TODAY_TUTORIAL }}
      tabs={
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <KretoPresence state="attentive" size="compact" className="shrink-0" />
          <button
            type="button"
            onClick={draftOutreach}
            className="btn-glass btn-glass-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Draft outreach
          </button>
          <button
            type="button"
            onClick={justChat}
            className="btn-glass btn-glass-outline inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Or just chat
          </button>
        </div>
      }
    />
  );
}

export default TodayHeader;
