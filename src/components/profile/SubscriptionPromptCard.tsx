import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type SubscriptionTier } from "@/lib/subscriptionLimits";

interface SubscriptionPromptCardProps {
  currentTier: SubscriptionTier;
}

export function SubscriptionPromptCard({ currentTier }: SubscriptionPromptCardProps) {
  const navigate = useNavigate();

  // Only show for free tier users
  if (currentTier !== 'free') return null;

  const Icon = Sparkles;

  return (
    <Card className="border-2 bg-gradient-to-br from-blue-500 to-cyan-500 p-[2px]">
      <CardContent className="bg-background rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Unlock More with Pro</h3>
            <p className="text-sm text-muted-foreground mb-3">Get serious about your creative career</p>
            <ul className="space-y-1 mb-4">
              <li className="text-sm flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary" />
                <span>Unlimited swipes</span>
              </li>
              <li className="text-sm flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary" />
                <span>AI match explanations</span>
              </li>
              <li className="text-sm flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary" />
                <span>Profile verification</span>
              </li>
              <li className="text-sm flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary" />
                <span>Advanced filters</span>
              </li>
            </ul>
            <Button 
              onClick={() => navigate('/subscription')} 
              className="w-full"
              size="sm"
            >
              Upgrade to Pro - $12/mo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
