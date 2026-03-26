import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { hasProAccess } from "@/lib/subscriptionConfig";

interface DiscoveryGateProps {
  /** Total items available */
  totalItems: number;
  /** How many free users can see */
  freePreviewCount: number;
  /** Current index (0-based) of the item being rendered */
  index: number;
  /** Label for what's being gated */
  itemLabel: string;
  children: React.ReactNode;
}

/**
 * Wraps discovery list items. Shows first N items clearly,
 * then renders a blur overlay with upsell CTA after the limit.
 * Pro/Enterprise/Founder users see everything.
 */
export function DiscoveryGate({ totalItems, freePreviewCount, index, itemLabel, children }: DiscoveryGateProps) {
  const { user, subscriptionInfo } = useAuth();
  const isPro = hasProAccess(subscriptionInfo.tier as any);

  // Pro users see everything
  if (isPro) return <>{children}</>;

  // Check if user unlocked via Thrive Points
  if (user) {
    try {
      const unlockKey = `thrivein_discovery_unlocked_${user.id}`;
      const stored = localStorage.getItem(unlockKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.unlocked) return <>{children}</>;
      }
    } catch {}
  }

  // Free users: show items within preview limit
  if (index < freePreviewCount) return <>{children}</>;

  // Don't render items beyond preview + 2 (just show a few blurred)
  if (index > freePreviewCount + 1) return null;

  // Show blurred item
  return (
    <div className="relative">
      <div className="pointer-events-none select-none filter blur-[6px] opacity-40 saturate-50">
        {children}
      </div>
    </div>
  );
}

interface DiscoveryUpsellProps {
  totalItems: number;
  freePreviewCount: number;
  itemLabel: string;
}

/**
 * Upsell CTA shown after the free preview items.
 * Offers subscription upgrade OR Thrive Points unlock.
 */
export function DiscoveryUpsell({ totalItems, freePreviewCount, itemLabel }: DiscoveryUpsellProps) {
  const navigate = useNavigate();
  const { subscriptionInfo } = useAuth();
  const isPro = hasProAccess(subscriptionInfo.tier as any);

  if (isPro || totalItems <= freePreviewCount) return null;

  const remaining = totalItems - freePreviewCount;

  return (
    <div className="col-span-full">
      <div className="bg-card/95 backdrop-blur-md border border-primary/20 rounded-2xl p-6 text-center shadow-xl shadow-primary/5">
        <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-bold mb-1">
          {remaining}+ more {itemLabel} to explore
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          Unlock the full directory with a Pro subscription or use your Thrive Points.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-xs mx-auto">
          <Button
            onClick={() => navigate("/subscription")}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Go Pro — $12/mo
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/thrivepay?tab=rewards")}
            className="flex-1 border-primary/30 text-primary hover:bg-primary/10 gap-2"
          >
            <Gift className="h-4 w-4" />
            Use Points
          </Button>
        </div>
      </div>
    </div>
  );
}
