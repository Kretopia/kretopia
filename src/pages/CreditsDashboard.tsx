import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyCredits } from "@/hooks/useMyCredits";
import { CreditsPermissionState } from "@/components/credits/CreditsPermissionState";
import { CreditsOverviewCard } from "@/components/credits/CreditsOverviewCard";
import { PersonalCreditsSearch } from "@/components/credits/PersonalCreditsSearch";
import { CreditsIdentityPanel, type IdentityProfile } from "@/components/credits/CreditsIdentityPanel";
import { CreditsStampsPanel } from "@/components/credits/CreditsStampsPanel";
import { CreditsHireMePanel, type HireMeProfile } from "@/components/credits/CreditsHireMePanel";
import { CreditsActivityTimeline } from "@/components/credits/CreditsActivityTimeline";
import { CreditsAIInsights } from "@/components/credits/CreditsAIInsights";
import { CreditsErrorState } from "@/components/credits/CreditsPrimitives";
import { CreditsAtmosphere } from "@/components/credits/CreditsAtmosphere";
import { CreditsFullRecord } from "@/components/credits/CreditsFullRecord";

type OwnProfile = IdentityProfile & HireMeProfile;

/**
 * /credits — the personal Credit Intelligence Dashboard.
 *
 * Everything on this page belongs to the signed-in person: their identity,
 * their stamps, their Hire Me profile, their activity and Kreto's review of
 * all of it. There is no public directory and no cross-user search here —
 * public discovery lives at /search.
 */
export default function CreditsDashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data?.user?.id ?? null))
      .catch(() => setUserId(null));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(rawQuery.trim()), 250);
    return () => window.clearTimeout(t);
  }, [rawQuery]);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "full_name, role, bio, avatar_url, location, is_discoverable, verification_score, icdb_creator_id, availability_status, availability_note, collab_intent, hourly_rate, project_rate, rate_currency, skills, site_headline",
      )
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      setProfileError(true);
      return;
    }
    setProfileError(false);
    setProfile((data as unknown as OwnProfile) ?? null);
  };

  useEffect(() => {
    if (!userId) return;
    loadProfile(userId).catch(() => setProfileError(true));
  }, [userId]);

  const { credits, overview, loading, searching, error, refresh } = useMyCredits(query);

  const completeness = useMemo(() => {
    const checks = [
      Boolean(profile?.full_name),
      Boolean(profile?.role),
      Boolean(profile?.bio),
      Boolean(profile?.avatar_url),
      Boolean(profile?.availability_status || profile?.collab_intent),
      (overview?.total_credits ?? 0) > 0,
      (overview?.verified_credits ?? 0) > 0,
      (overview?.missing_evidence ?? 0) === 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile, overview]);

  const nextAction = useMemo(() => {
    if (!overview || overview.total_credits === 0)
      return { label: "Add your first credit", onClick: () => navigate("/profile?add=credit") };
    if (overview.missing_evidence > 0)
      return {
        label: `Attach evidence to ${overview.missing_evidence} credit${overview.missing_evidence > 1 ? "s" : ""}`,
        onClick: () => document.getElementById("stamps")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      };
    if (overview.pending_credits > 0)
      return {
        label: "Ask for a co-sign on your pending work",
        onClick: () => document.getElementById("stamps")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      };
    if (!profile?.bio) return { label: "Write your bio", onClick: () => navigate("/profile/edit") };
    return null;
  }, [overview, profile, navigate]);

  if (userId === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (userId === null) return <CreditsPermissionState />;

  return (
    <>
      <Helmet>
        <title>Credits — Your Verified Creative Record | Kretopia</title>
        <meta
          name="description"
          content="Your private Credits dashboard: identity, verified stamps, Hire Me profile, activity and what to do next."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="dark relative min-h-screen bg-background pb-24" style={{ backgroundColor: "#05070D" }}>
        <CreditsAtmosphere />
        <main className="container relative mx-auto max-w-3xl px-4 pt-8">
          <header className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Creative Passport</p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(100deg,#FFFFFF 20%,#FF2DA1 55%,#17D9D4 90%)" }}
              >
                Credits
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
              Your professional identity and the verified creative work behind it — in one private place.
            </p>
          </header>

          <div className="mb-5">
            <PersonalCreditsSearch
              value={rawQuery}
              onChange={setRawQuery}
              searching={searching}
              resultCount={credits.length}
            />
          </div>

          {error === "auth" ? (
            <CreditsErrorState
              message="Your session expired. Sign in again to see your record."
              onRetry={() => navigate("/auth?redirect=/credits")}
            />
          ) : error === "network" ? (
            <CreditsErrorState message="We couldn't load your credits just now." onRetry={() => refresh()} />
          ) : (
            <div className="space-y-4">
              <CreditsOverviewCard
                overview={overview}
                completeness={completeness}
                nextAction={nextAction}
                loading={loading}
              />

              {profileError ? (
                <CreditsErrorState
                  message="We couldn't load your identity details."
                  onRetry={() => userId && loadProfile(userId)}
                />
              ) : (
                <>
                  <CreditsIdentityPanel profile={profile} index={0} />
                  <CreditsHireMePanel profile={profile} index={1} />
                </>
              )}

              <CreditsStampsPanel credits={credits} loading={loading} query={query} index={2} />
              <CreditsActivityTimeline credits={credits} loading={loading} index={3} />
              <CreditsFullRecord index={5} />
              <CreditsAIInsights
                userId={userId}
                index={4}
                onApplied={() => {
                  loadProfile(userId).catch(() => setProfileError(true));
                }}
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
