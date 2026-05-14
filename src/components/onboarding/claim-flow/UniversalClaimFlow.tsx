import { useState, useEffect } from "react";
import { SearchOrPasteStep } from "./SearchOrPasteStep";
import { DisambiguationStep } from "./DisambiguationStep";
import { VerifyMatchesStep } from "./VerifyMatchesStep";
import { ProfilePreviewStep } from "./ProfilePreviewStep";
import { OptionalFaceVerifyStep } from "./OptionalFaceVerifyStep";
import { EmailSaveStep } from "./EmailSaveStep";
import { ProfileRevealStep } from "./ProfileRevealStep";
import type { ClaimContext, ClaimedCredit, DraftProfile, FlowStep, WebCreditResult } from "./types";

interface Props extends ClaimContext {}

/**
 * Universal Claim Flow orchestrator.
 * Steps: search → disambiguate → verify → preview → email.
 *
 * If the landing page (or another entry point) has already pre-fetched results,
 * it stashes them in sessionStorage under "claim_intent" — we hydrate from that
 * and jump straight to the disambiguation step.
 */
export const UniversalClaimFlow = ({
  source,
  initialQuery,
  redirectAfter,
  contextId,
}: Props) => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlQuery = urlParams.get("q") || "";
  const isClaimEntry = urlParams.get("claim") === "1";
  const [step, setStep] = useState<FlowStep>("search");
  const [query, setQuery] = useState(initialQuery || urlQuery || "");
  const [results, setResults] = useState<WebCreditResult[]>([]);
  const [selected, setSelected] = useState<ClaimedCredit[]>([]);
  const [draft, setDraft] = useState<DraftProfile>({});

  // Hydrate from claim_intent (set by landing search) so we land on disambiguation
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("claim_intent");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const intentQuery = parsed?.q || urlQuery;
      if (!intentQuery) return;
      // Only honor recent intents (10 min)
      if (parsed.ts && Date.now() - parsed.ts > 10 * 60 * 1000) return;
      setQuery(intentQuery);
      if (Array.isArray(parsed.results)) {
        const normalized: WebCreditResult[] = parsed.results.map((r: any) => ({
          ...r,
          thumbnail: r.thumbnail || r.image_url || undefined,
        }));
        setResults(normalized);
        setStep("disambiguate");
      }
    } catch {}
  }, [urlQuery]);

  useEffect(() => {
    if (isClaimEntry && urlQuery && results.length === 0) {
      setQuery(urlQuery);
      setStep("disambiguate");
    }
  }, [isClaimEntry, results.length, urlQuery]);

  const handleResults = (r: WebCreditResult[], q: string) => {
    setQuery(q);
    setResults(r);
    // Cache so a re-render or back-nav shows the same set
    try {
      sessionStorage.setItem(
        `claim_search:${q.toLowerCase()}`,
        JSON.stringify({ ts: Date.now(), query: q, results: r }),
      );
    } catch {}
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

  const [faceMatchScore, setFaceMatchScore] = useState<number | null>(null);

  const handleConfirmProfile = (p: DraftProfile, credits: ClaimedCredit[]) => {
    setDraft(p);
    setSelected(credits);
    setStep("face");
  };

  const finalRedirect =
    redirectAfter ||
    (source === "gig" && contextId
      ? `/gig/${contextId}?claimed=true`
      : source === "event" && contextId
      ? `/event/${contextId}?claimed=true`
      : "/circle?welcome=match");

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
      {step === "face" && (
        <OptionalFaceVerifyStep
          profile={draft}
          credits={selected}
          onBack={() => setStep("preview")}
          onSkip={() => setStep("reveal")}
          onVerified={(score) => {
            setFaceMatchScore(score);
            setStep("reveal");
          }}
        />
      )}
      {step === "reveal" && (
        <ProfileRevealStep
          profile={draft}
          credits={selected}
          onBack={() => setStep("preview")}
          onConfirm={() => setStep("email")}
        />
      )}
      {step === "email" && (
        <EmailSaveStep
          profile={draft}
          credits={selected}
          onBack={() => setStep("face")}
          redirectAfter={finalRedirect}
          faceMatchScore={faceMatchScore}
        />
      )}
    </div>
  );
};
