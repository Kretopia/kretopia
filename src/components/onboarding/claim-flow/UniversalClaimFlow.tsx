import { useState } from "react";
import { SearchOrPasteStep } from "./SearchOrPasteStep";
import { DisambiguationStep } from "./DisambiguationStep";
import { VerifyMatchesStep } from "./VerifyMatchesStep";
import { ProfilePreviewStep } from "./ProfilePreviewStep";
import { EmailSaveStep } from "./EmailSaveStep";
import type { ClaimContext, ClaimedCredit, DraftProfile, FlowStep, WebCreditResult } from "./types";

interface Props extends ClaimContext {}

/**
 * Universal Claim Flow orchestrator.
 * Steps: search → disambiguate → verify → preview → email.
 */
export const UniversalClaimFlow = ({
  source,
  initialQuery,
  redirectAfter,
  contextId,
}: Props) => {
  const [step, setStep] = useState<FlowStep>("search");
  const [query, setQuery] = useState(initialQuery || "");
  const [results, setResults] = useState<WebCreditResult[]>([]);
  const [selected, setSelected] = useState<ClaimedCredit[]>([]);
  const [draft, setDraft] = useState<DraftProfile>({});

  const handleResults = (r: WebCreditResult[], q: string) => {
    setQuery(q);
    setResults(r);
    setStep("disambiguate");
  };

  const handleConfirmCredits = (chosen: ClaimedCredit[]) => {
    setSelected(chosen);
    setStep("verify");
  };

  const handleVerified = (verified: ClaimedCredit[], reportedIds: string[]) => {
    setSelected(verified);
    if (reportedIds.length > 0) {
      try {
        console.info("[claim-flow] reported wrong matches", {
          count: reportedIds.length,
          query,
          source,
        });
      } catch {}
    }
    setStep("preview");
  };

  const handleConfirmProfile = (p: DraftProfile, credits: ClaimedCredit[]) => {
    setDraft(p);
    setSelected(credits);
    setStep("email");
  };

  const finalRedirect =
    redirectAfter ||
    (source === "gig" && contextId
      ? `/gig/${contextId}?claimed=true`
      : source === "event" && contextId
      ? `/event/${contextId}?claimed=true`
      : "/profile?claimed=true");

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      {step === "search" && (
        <SearchOrPasteStep initialQuery={query} onResults={handleResults} />
      )}
      {step === "disambiguate" && (
        <DisambiguationStep
          results={results}
          query={query}
          onBack={() => setStep("search")}
          onConfirm={handleConfirmCredits}
          onPasteLink={() => setStep("search")}
          onSkipToSignup={() => {
            setSelected([]);
            setDraft({ full_name: query });
            setStep("email");
          }}
        />
      )}
      {step === "verify" && (
        <VerifyMatchesStep
          credits={selected}
          onBack={() => setStep("disambiguate")}
          onConfirm={handleVerified}
        />
      )}
      {step === "preview" && (
        <ProfilePreviewStep
          query={query}
          selectedCredits={selected}
          onBack={() => setStep("verify")}
          onConfirm={handleConfirmProfile}
        />
      )}
      {step === "email" && (
        <EmailSaveStep
          profile={draft}
          credits={selected}
          onBack={() => setStep("preview")}
          redirectAfter={finalRedirect}
        />
      )}
    </div>
  );
};
