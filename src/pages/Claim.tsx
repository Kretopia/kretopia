import { useSearchParams } from "react-router-dom";
import { UniversalClaimFlow } from "@/components/onboarding/claim-flow/UniversalClaimFlow";
import { BrandLogo } from "@/components/BrandLogo";
import type { ClaimSource } from "@/components/onboarding/claim-flow/types";

/**
 * Public landing for the unified Search → Claim → Email flow.
 * Used by landing-hero search, gig claim, and event RSVP-as-guest CTAs.
 *
 * Query params:
 *   q         — pre-fill the search input
 *   source    — auth | landing | gig | event (analytics + redirect)
 *   gig       — gig id (only when source=gig)
 *   event     — event id (only when source=event)
 *   redirect  — explicit redirect override
 */
const Claim = () => {
  const [params] = useSearchParams();
  const sourceRaw = (params.get("source") || "landing") as ClaimSource;
  const source: ClaimSource = ["auth", "landing", "gig", "event"].includes(sourceRaw)
    ? sourceRaw
    : "landing";
  const initialQuery = params.get("q") || undefined;
  const gigId = params.get("gig") || undefined;
  const eventId = params.get("event") || undefined;
  const redirect = params.get("redirect") || undefined;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="px-4 py-4 flex items-center justify-center pt-[max(env(safe-area-inset-top),1rem)]">
        <BrandLogo size="md" showBeta />
      </header>
      <main className="flex-1 flex items-start justify-center">
        <UniversalClaimFlow
          source={source}
          initialQuery={initialQuery}
          contextId={gigId || eventId}
          redirectAfter={redirect}
        />
      </main>
      <footer className="text-center text-[11px] text-muted-foreground pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 px-4">
        Already have an account?{" "}
        <a href="/auth?tab=signin" className="text-primary hover:underline font-semibold">
          Sign in
        </a>
      </footer>
    </div>
  );
};

export default Claim;
