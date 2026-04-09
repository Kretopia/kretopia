import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Lightbulb, TrendingUp, Users, Heart } from "lucide-react";
import { AIMatchBadge } from "./AIMatchBadge";

interface AIMatchRecommendationsProps {
  matchScore?: number;
  matchReasons?: string[];
  onExplainMatch?: () => void;
  socialStats?: {
    instagram_followers?: number;
    youtube_subscribers?: number;
    tiktok_followers?: number;
    verified_metrics?: boolean;
  };
  showLocked?: boolean;
}

export const AIMatchRecommendations = ({
  matchScore,
  matchReasons = [],
  onExplainMatch,
  socialStats,
  showLocked = false
}: AIMatchRecommendationsProps) => {
  const navigate = useNavigate();
  if (showLocked) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">AI Match Insights</h3>
            </div>
            <AIMatchBadge score={0} showLocked={true} size="sm" />
          </div>
          <div className="space-y-2 opacity-50">
            <div className="flex items-start gap-2 text-xs">
              <Lightbulb className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                Unlock AI-powered match insights to see why this person is perfect for collaboration
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="w-full gap-2"
            onClick={() => navigate('/subscription')}
          >
            <Sparkles className="h-4 w-4" />
            Upgrade to See Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!matchScore || matchReasons.length === 0) return null;

  const getInsightIcon = (reason: string) => {
    const lower = reason.toLowerCase();
    if (lower.includes('skill') || lower.includes('complement')) return TrendingUp;
    if (lower.includes('location') || lower.includes('city')) return Users;
    if (lower.includes('interest') || lower.includes('passion')) return Heart;
    return Lightbulb;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Why This Match?</h3>
          </div>
          <AIMatchBadge score={matchScore} size="sm" />
        </div>

        <div className="space-y-2">
          {matchReasons.slice(0, 3).map((reason, index) => {
            const Icon = getInsightIcon(reason);
            return (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                  {reason}
                </p>
              </div>
            );
          })}
        </div>

        {socialStats?.verified_metrics && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              Verified Stats
            </Badge>
            {socialStats.instagram_followers && socialStats.instagram_followers > 10000 && (
              <Badge variant="outline" className="text-xs">
                {socialStats.instagram_followers >= 1000000 
                  ? `${(socialStats.instagram_followers / 1000000).toFixed(1)}M IG`
                  : `${(socialStats.instagram_followers / 1000).toFixed(0)}K IG`
                }
              </Badge>
            )}
          </div>
        )}

        {onExplainMatch && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs gap-2 hover:bg-primary/10 hover:text-primary"
            onClick={onExplainMatch}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            See Detailed Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
