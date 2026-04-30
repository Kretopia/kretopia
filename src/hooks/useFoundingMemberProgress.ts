import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FOUNDING_QUESTS, type FoundingQuestKey } from "@/lib/foundingMember";

export interface QuestProgress {
  key: FoundingQuestKey;
  current: number;
  target: number;
  completed: boolean;
}

interface State {
  loading: boolean;
  progress: Record<FoundingQuestKey, QuestProgress>;
  completedCount: number;
  allComplete: boolean;
  badgeAwarded: boolean;
  refresh: () => Promise<void>;
}

const emptyProgress = (): Record<FoundingQuestKey, QuestProgress> => ({
  claim_profile: { key: "claim_profile", current: 0, target: 1, completed: false },
  log_credits: { key: "log_credits", current: 0, target: 3, completed: false },
  invite_signups: { key: "invite_signups", current: 0, target: 3, completed: false },
});

export function useFoundingMemberProgress(): State {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<FoundingQuestKey, QuestProgress>>(emptyProgress());
  const [badgeAwarded, setBadgeAwarded] = useState(false);

  const compute = useCallback(async () => {
    if (!user) {
      setProgress(emptyProgress());
      setLoading(false);
      return;
    }
    setLoading(true);

    const next = emptyProgress();

    // 1. claim_profile — verification_score > 0
    const profileQ = await supabase
      .from("profiles")
      .select("verification_score, badge")
      .eq("user_id", user.id)
      .maybeSingle()
      .catch(() => ({ data: null }) as any);
    const score = (profileQ as any)?.data?.verification_score ?? 0;
    next.claim_profile.current = score > 0 ? 1 : 0;
    next.claim_profile.completed = score > 0;
    const currentBadge = (profileQ as any)?.data?.badge as string | null;

    // 2. log_credits — credits row count
    const creditsQ = await supabase
      .from("credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .catch(() => ({ count: 0 }) as any);
    const creditCount = (creditsQ as any)?.count ?? 0;
    next.log_credits.current = Math.min(creditCount, 3);
    next.log_credits.completed = creditCount >= 3;

    // 3. invite_signups — referral_network.active_referral_count
    const refQ = await supabase
      .from("referral_network")
      .select("active_referral_count, referral_count")
      .eq("user_id", user.id)
      .maybeSingle()
      .catch(() => ({ data: null }) as any);
    const refCount =
      (refQ as any)?.data?.active_referral_count ??
      (refQ as any)?.data?.referral_count ??
      0;
    next.invite_signups.current = Math.min(refCount, 3);
    next.invite_signups.completed = refCount >= 3;

    setProgress(next);

    // Sync server-side quest rows (best-effort)
    const upserts = (Object.keys(next) as FoundingQuestKey[]).map((key) => ({
      user_id: user.id,
      quest_key: key,
      completed: next[key].completed,
      completed_at: next[key].completed ? new Date().toISOString() : null,
    }));
    await supabase
      .from("founding_member_quests")
      .upsert(upserts, { onConflict: "user_id,quest_key" })
      .catch(() => null);

    const allComplete =
      next.claim_profile.completed &&
      next.log_credits.completed &&
      next.invite_signups.completed;

    if (allComplete && currentBadge !== "founding_member" && currentBadge !== "founder" && currentBadge !== "og") {
      const { data: awarded } = await supabase
        .rpc("award_founding_member_badge", { _user_id: user.id })
        .catch(() => ({ data: false }) as any);
      setBadgeAwarded(Boolean(awarded));
    } else {
      setBadgeAwarded(currentBadge === "founding_member");
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    compute();
  }, [compute]);

  const completedCount = (Object.values(progress) as QuestProgress[]).filter((q) => q.completed).length;
  const allComplete = completedCount === FOUNDING_QUESTS.length;

  return { loading, progress, completedCount, allComplete, badgeAwarded, refresh: compute };
}
