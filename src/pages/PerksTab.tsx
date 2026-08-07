import { useEffect, useState } from "react";
import { Check, Lock, Shield, Zap, Award, Star, Crown, Sparkles, Loader2, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateStatusFromCredits, getAllTiers } from "@/lib/statusEngine";

const TIER_ICONS = [Shield, Zap, Award, Star, Crown, Sparkles];

/**
 * /perks — real ThriveStatus tier ladder and the perks each tier actually
 * unlocks (statusEngine.getAllTiers(), the same data TierBenefitsComparison
 * uses). Current tier is computed from the user's own verified credits, not
 * invented. No fabricated partner discounts or member counts — those don't
 * exist as real data yet, so they're simply not shown.
 */
export default function PerksTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentTierIdx, setCurrentTierIdx] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("credits")
        .select("verification_status")
        .eq("user_id", user.id);
      if (cancelled) return;
      const status = calculateStatusFromCredits(data ?? []);
      setCurrentTierIdx(status.tierIndex);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const allTiers = getAllTiers();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#05070D] text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div>
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] border border-white/10">
            <Gift className="h-5 w-5 text-[#FF2DA1]" />
          </div>
          <h1 className="mb-1.5 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.05]">Perks</h1>
          <p className="text-white/60 max-w-xl">
            What each ThriveStatus tier unlocks. Perks stack as your verified credits and
            reputation grow.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-white/40 text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your status…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allTiers.map((tier, idx) => {
              const isCurrentTier = !!user && idx === currentTierIdx;
              const isUnlocked = !!user && idx <= currentTierIdx;
              const Icon = TIER_ICONS[idx];
              return (
                <div
                  key={tier.tier}
                  className={`flex flex-col min-h-[216px] rounded-xl border p-4 ${
                    isCurrentTier ? "border-[#FF2DA1]/50 bg-[#FF2DA1]/[0.05]" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <Icon className={`h-4 w-4 shrink-0 ${isUnlocked ? "text-[#FF2DA1]" : "text-white/30"}`} aria-hidden />
                    <h3 className="text-sm font-bold truncate">{tier.label}</h3>
                    {isCurrentTier && (
                      <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wider font-bold text-[#FF2DA1] bg-[#FF2DA1]/10 px-1.5 py-0.5 rounded">
                        Your status
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-3">
                    {tier.perks.map((perk, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Check className={`h-3 w-3 mt-0.5 shrink-0 ${isUnlocked ? "text-[#FF2DA1]" : "text-white/25"}`} aria-hidden />
                        <span className={`line-clamp-1 ${isUnlocked ? "text-white/80" : "text-white/35"}`}>{perk}</span>
                      </div>
                    ))}
                  </div>

                  {!isUnlocked && (
                    <div className="flex items-center gap-1.5 text-[11px] text-white/35 mt-auto pt-3 border-t border-white/10">
                      <Lock className="h-3 w-3 shrink-0" aria-hidden />
                      Build your reputation to unlock
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-white/35">
          Partner discounts and Founding Circle rewards land here as they go live — nothing listed
          above is a placeholder.
        </p>
      </div>
    </div>
  );
}
