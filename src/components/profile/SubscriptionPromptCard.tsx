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

  if (currentTier === 'studio') return null;

  const promptConfig = {
    free: {
      icon: Sparkles,
      gradient: "from-blue-500 to-cyan-500",
      title: "Unlock More with Pro",
      features: ["Unlimited swipes", "5 active projects", "10 AI matches/day", "Profile verification"],
      cta: "Upgrade to Pro - $9/mo",
      description: "Get serious about your creative career"
    },
    pro: {
      icon: Crown,
      gradient: "from-yellow-500 to-orange-500",
      title: "Go Studio for Max Impact",
      features: ["Unlimited projects", "Featured profile (3x visibility)", "Priority matching", "Unlimited AI"],
      cta: "Upgrade to Studio - $29/mo",
      description: "Become a platform power user"
    }
  };

  const config = currentTier === 'free' ? promptConfig.free : promptConfig.pro;
  const Icon = config.icon;

  return (
    <Card className={`border-2 bg-gradient-to-br ${config.gradient} p-[2px]`}>
      <CardContent className="bg-background rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{config.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
            <ul className="space-y-1 mb-4">
              {config.features.map((feature, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <Zap className="h-3 w-3 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => navigate('/subscription')} 
              className="w-full"
              size="sm"
            >
              {config.cta}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
