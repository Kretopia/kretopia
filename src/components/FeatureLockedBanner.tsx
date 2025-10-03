import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureLockedBannerProps {
  feature: string;
  tier: "thriver" | "creator_pro";
  description?: string;
}

export function FeatureLockedBanner({ feature, tier, description }: FeatureLockedBannerProps) {
  const navigate = useNavigate();

  const Icon = tier === "creator_pro" ? Crown : Sparkles;
  const tierName = tier === "creator_pro" ? "Creator Pro" : "Thriver";
  const color = tier === "creator_pro" ? "text-yellow-600" : "text-purple-600";

  return (
    <Alert className="border-primary/50 bg-primary/5">
      <Lock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <div>
            <span className="font-semibold">{feature}</span>
            <span className="text-muted-foreground"> is a {tierName} feature</span>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        <Button 
          onClick={() => navigate("/subscription")}
          variant="default"
          size="sm"
          className="flex-shrink-0"
        >
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
}
