import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Users, ArrowRight, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuickMatchBannerProps {
  userId?: string;
  className?: string;
}

export const QuickMatchBanner = ({ userId, className }: QuickMatchBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      checkUserStats();
    }
  }, [userId]);

  const checkUserStats = async () => {
    if (!userId) return;

    try {
      // Check if already dismissed
      const dismissedKey = `quick_match_dismissed_${userId}`;
      if (localStorage.getItem(dismissedKey)) {
        setDismissed(true);
        return;
      }

      // Get match and swipe counts
      const [matchResult, swipeResult] = await Promise.all([
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .eq('status', 'active'),
        supabase
          .from('swipes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ]);

      setMatchCount(matchResult.count || 0);
      setSwipeCount(swipeResult.count || 0);
    } catch (error) {
      console.error('Error checking user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (userId) {
      localStorage.setItem(`quick_match_dismissed_${userId}`, 'true');
    }
    setDismissed(true);
  };

  // Don't show if dismissed, loading, or user already has 3+ matches
  if (dismissed || loading || matchCount >= 3) return null;

  // Calculate progress towards first few matches
  const targetSwipes = 10;
  const progress = Math.min((swipeCount / targetSwipes) * 100, 100);
  const swipesToGo = Math.max(targetSwipes - swipeCount, 0);

  return (
    <Card className={cn(
      "relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10",
      className
    )}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
      
      <div className="relative p-4 sm:p-6">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 p-3 rounded-2xl bg-primary/20">
            <Zap className="h-8 w-8 text-primary animate-pulse" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {matchCount === 0 ? (
              <>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Get Your First Match!
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {swipesToGo > 0 
                    ? `Just ${swipesToGo} more swipes to unlock your first potential match!`
                    : "You're on the verge of your first match! Keep exploring."}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress to first match</span>
                    <span className="font-medium text-primary">{swipeCount}/{targetSwipes} swipes</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {matchCount} Match{matchCount !== 1 ? 'es' : ''} Found!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Great start! Connect with {matchCount === 1 ? 'them' : 'more creators'} to unlock collaboration opportunities.
                </p>
              </>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={() => navigate('/connect')}
            className="shrink-0 gap-2 shadow-lg"
            size="lg"
          >
            {matchCount === 0 ? (
              <>
                Start Matching
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                View Matches
                <Users className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
