import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PlanCard } from "@/lib/subscriptionPlans";

const ACCENT = "hsl(var(--energy))";

interface PlanDetailsModalProps {
  plan: PlanCard | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isCurrentTier: boolean;
  isLoading: boolean;
  founderSpotsTaken?: number;
  founderMaxSpots?: number;
}

/**
 * Plan details modal — same dark plate, aurora glow and bottom-anchored
 * primary button as FeatureAITutorial's "How this works" dialog, so the
 * two feel like one system instead of two different dialog styles.
 */
export function PlanDetailsModal({
  plan,
  open,
  onClose,
  onConfirm,
  isCurrentTier,
  isLoading,
  founderSpotsTaken = 0,
  founderMaxSpots,
}: PlanDetailsModalProps) {
  if (!plan) return null;
  const Icon = plan.icon;
  const showFounderProgress = plan.isFounder && founderMaxSpots && founderMaxSpots > 0;
  const founderPct = showFounderProgress ? (founderSpotsTaken / founderMaxSpots!) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="dark max-w-lg p-0 overflow-hidden border-white/10"
        style={{ backgroundColor: "#05070D" }}
      >
        <DialogTitle className="sr-only">{plan.name} plan details</DialogTitle>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(255,45,161,0.12), transparent 65%)" }}
        />
        <div className="relative p-6 max-h-[80vh] overflow-y-auto">
          <p className="landing-eyebrow mb-1">{plan.oneTime ? "One-time" : "Subscription"}</p>
          <h2 className="landing-h2 landing-glow text-2xl mb-1 flex items-center gap-2">
            <Icon className="h-6 w-6 shrink-0" style={{ color: ACCENT }} aria-hidden />
            {plan.name}
            <span className="pink-glow-breathe" style={{ color: ACCENT }}>.</span>
          </h2>
          <p className="text-sm text-white/60 mb-4">{plan.tagline}</p>

          <div className="mb-5 flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-white">{plan.displayPrice}</span>
            {!plan.oneTime && plan.price > 0 && <span className="text-white/50">/month</span>}
            {plan.oneTime && <span className="text-white/50">one-time</span>}
          </div>

          {showFounderProgress && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>{founderSpotsTaken} claimed</span>
                <span>{founderMaxSpots} total</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${founderPct}%`, background: ACCENT }}
                />
              </div>
            </div>
          )}

          <ul className="space-y-2.5 mb-6">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: ACCENT }} aria-hidden />
                {feature}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || isCurrentTier || plan.soldOut}
            className={cn(
              "btn-glass btn-glass-primary w-full rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2",
              (isLoading || isCurrentTier || plan.soldOut) && "opacity-60",
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isCurrentTier ? "Current Plan" : plan.soldOut ? "Sold Out" : plan.ctaLabel}
          </button>
          {!isCurrentTier && !plan.soldOut && plan.price > 0 && (
            <p className="text-xs text-white/35 text-center mt-3">Secure checkout via Stripe · Cancel anytime</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlanDetailsModal;
