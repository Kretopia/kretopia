import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Zap, Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SubscriptionTier } from "@/lib/subscriptionLimits";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
  feature: string;
  description: string;
  benefits?: string[];
}

const TIER_INFO = {
  pro: {
    name: "Pro",
    price: "$9",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
  },
  studio: {
    name: "Studio",
    price: "$29",
    icon: Crown,
    color: "from-yellow-500 to-orange-500",
  },
};

export function UpgradeDialog({
  open,
  onOpenChange,
  currentTier,
  feature,
  description,
  benefits = [],
}: UpgradeDialogProps) {
  const navigate = useNavigate();

  // Determine which tier to suggest based on current tier
  const suggestedTier = currentTier === "free" ? "pro" : "studio";
  const tierInfo = TIER_INFO[suggestedTier];
  const Icon = tierInfo.icon;

  const defaultBenefits = suggestedTier === "pro" ? [
    "Unlimited daily swipes & matches",
    "5 active projects",
    "10 AI recommendations/day",
    "3 undo swipes/day",
    "Profile verification badge",
    "Unlimited portfolio items",
    "Advanced filters",
    "10% partner discounts",
    "Read receipts",
  ] : [
    "Everything in Pro",
    "Unlimited projects",
    "Unlimited AI recommendations",
    "Unlimited undo swipes",
    "Featured profile (3x visibility)",
    "Priority matching algorithm",
    "Advanced analytics dashboard",
    "15-20% partner discounts",
    "Early access to features",
    "Dedicated support",
  ];

  const displayBenefits = benefits.length > 0 ? benefits : defaultBenefits;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-full bg-gradient-to-br ${tierInfo.color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Unlock {feature}</DialogTitle>
              <Badge variant="secondary" className="mt-1">
                {tierInfo.name} Feature
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{tierInfo.price}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Start your free trial today. Cancel anytime.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">What you'll get:</p>
            <ul className="space-y-2">
              {displayBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/subscription");
            }}
            className={`w-full sm:w-auto bg-gradient-to-r ${tierInfo.color} hover:opacity-90`}
          >
            Upgrade Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
