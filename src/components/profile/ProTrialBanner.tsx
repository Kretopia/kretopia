import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Gift, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProTrialBannerProps {
  subscriptionStatus: string | null;
  subscriptionEndDate: string | null;
  subscriptionTier: string | null;
}

export function ProTrialBanner({ 
  subscriptionStatus, 
  subscriptionEndDate,
  subscriptionTier 
}: ProTrialBannerProps) {
  const navigate = useNavigate();
  
  const isTrialActive = subscriptionStatus === "trial" && 
    subscriptionEndDate && 
    new Date(subscriptionEndDate) > new Date();
  
  // Don't show if not on trial or not pro tier
  if (!isTrialActive || subscriptionTier !== 'pro') return null;
  
  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <Card className="mb-4 border-2 border-primary/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-purple-500/10 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Gift className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg">Welcome Gift: 1-Month Free Pro!</h3>
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Pro Trial
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Enjoy all Pro features free for your first month. All premium features unlocked!
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <Clock className="h-4 w-4" />
                {daysRemaining} days remaining
              </span>
              <span className="text-muted-foreground">
                Ends {new Date(subscriptionEndDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}