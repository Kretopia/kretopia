import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Star, TrendingUp, Users, Zap, Loader2, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PortfolioItem {
  title: string;
  description?: string;
  media_type: string;
  media_url: string;
  category?: string;
  tags?: string[];
}

interface ReviewData {
  strengths: string;
  marketPosition: string;
  optimizationTips: string;
  collaborationPotential: string;
  quickWin: string;
  suggestedTags: string[];
  overallScore: number;
}

interface AIPortfolioReviewProps {
  item: PortfolioItem;
  userRole?: string;
}

export const AIPortfolioReview = ({ item, userRole }: AIPortfolioReviewProps) => {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getReview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-portfolio-review', {
        body: {
          title: item.title,
          description: item.description,
          mediaType: item.media_type,
          mediaUrl: item.media_url,
          category: item.category,
          tags: item.tags,
          role: userRole,
        }
      });

      if (error) throw error;
      if (data?.review) {
        setReview(data.review);
      }
    } catch (error: any) {
      toast({
        title: "Review failed",
        description: error.message || "Could not generate review. Try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!review) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={getReview}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            AI Review
          </>
        )}
      </Button>
    );
  }

  const scoreColor = review.overallScore >= 80 ? 'text-green-500' : review.overallScore >= 60 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Portfolio Review
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${scoreColor}`}>{review.overallScore}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
        <Progress value={review.overallScore} className="h-1.5" />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Star className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-xs text-muted-foreground mb-0.5">Strengths</p>
            <p>{review.strengths}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-xs text-muted-foreground mb-0.5">Market Position</p>
            <p>{review.marketPosition}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-xs text-muted-foreground mb-0.5">Optimization</p>
            <p>{review.optimizationTips}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-xs text-muted-foreground mb-0.5">Collaboration Potential</p>
            <p>{review.collaborationPotential}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-xs text-primary mb-0.5">Quick Win</p>
            <p>{review.quickWin}</p>
          </div>
        </div>

        {review.suggestedTags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-1">Suggested tags:</span>
            {review.suggestedTags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
