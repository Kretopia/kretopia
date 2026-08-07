import { useEffect } from "react";
import { Sparkles, PenLine, IdCard, Compass, Send } from "lucide-react";
import { BRAND } from "@/lib/brandLexicon";

const QUICK_ACTIONS = [
  {
    icon: PenLine,
    label: "Draft a pitch",
    prompt: "Help me draft a pitch for an opportunity I'm considering.",
  },
  {
    icon: IdCard,
    label: "Improve my Passport",
    prompt: "Look at my Passport and tell me what would make it stronger.",
  },
  {
    icon: Compass,
    label: "Find matching opportunities",
    prompt: "Find opportunities that match my skills and availability right now.",
  },
  {
    icon: Send,
    label: "Prepare a follow-up",
    prompt: "Help me prepare a follow-up message for a conversation that's gone quiet.",
  },
] as const;

function openKreto(prompt?: string) {
  window.dispatchEvent(
    new CustomEvent("thrive-copilot:open", { detail: prompt ? { prompt } : {} })
  );
}

/**
 * /kreto — live workspace entry point. Auto-opens the real Copilot (Sheet,
 * mounted globally in App.tsx) on arrival instead of showing a static
 * placeholder, and surfaces one-tap quick actions for the most common
 * intents. Closing the sheet leaves this page's quick actions in place.
 */
export default function KretoTab() {
  useEffect(() => {
    openKreto();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-border/60 bg-card p-8">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mb-2 font-serif text-3xl">Meet {BRAND.agentName}.</h1>
        <p className="mb-6 text-muted-foreground">
          {BRAND.agentRole}. I find opportunities, draft pitches, keep your Passport sharp,
          and help you close the loop from search to paid credit.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => openKreto(prompt)}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-left text-sm font-medium hover:border-primary/50 hover:bg-accent/40 transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {BRAND.agentName} opens automatically below — or tap the {BRAND.agentName} button anywhere on Kretopia to start.
        </p>
      </div>
    </div>
  );
}
