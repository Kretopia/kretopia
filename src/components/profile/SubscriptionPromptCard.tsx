import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type SubscriptionTier } from "@/lib/subscriptionLimits";

interface SubscriptionPromptCardProps {
  currentTier: SubscriptionTier;
}

export function SubscriptionPromptCard({ currentTier }: SubscriptionPromptCardProps) {
  const navigate = useNavigate();

  // Only show for free tier users
  if (currentTier !== 'free') return null; // Pro and Founder both hide this

  const proFeatures = [
    "Unlimited swipes & matches",
    "Unlimited AI briefs & templates",
    "Full P&L dashboard & reports",
    "Profile verification badge",
    "Unlimited invoicing & expense tracking",
    "Advanced search filters",
    "Save 17% with annual billing",
  ];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Go Pro — $15/mo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Unlimited tools, verified badge, and full business suite. Try free for 7 days.
            </p>
            <ul className="space-y-2 mb-4">
              {proFeatures.map((feature, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => navigate('/subscription')} 
              className="w-full"
              size="sm"
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
