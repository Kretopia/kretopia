import { Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brandLexicon";

/**
 * V1 /kreto tab — full-page Kreto surface.
 * Phase 8 will replace this with a full conversational EP surface. For now,
 * the KretoFab is universally available, so this page frames intent and
 * cues the user to open Kreto.
 */
export default function KretoTab() {
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
        <p className="text-sm text-muted-foreground">
          Tap the {BRAND.agentName} button anywhere on Kretopia to start.
        </p>
      </div>
    </div>
  );
}
