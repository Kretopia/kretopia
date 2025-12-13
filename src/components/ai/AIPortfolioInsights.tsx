import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Eye, Star, Lock, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AIPortfolioInsightsProps {
  portfolioItems: any[];
  userRole: string;
  isPro: boolean;
}

interface Insights {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  trendingTips: string[];
}

export function AIPortfolioInsights({ portfolioItems = [], userRole, isPro }: AIPortfolioInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const safePortfolioItems = portfolioItems || [];

  const generateInsights = async () => {
    if (!isPro) {
      navigate("/subscription");
      return;
    }

    setLoading(true);
    try {
      const portfolioSummary = safePortfolioItems.slice(0, 5).map(item => ({
        title: item.title,
        type: item.media_type,
        description: item.description?.slice(0, 100)
      }));

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          messages: [{
            role: 'user',
            content: `Analyze this creator's portfolio and provide insights. Be encouraging but specific.

Role: ${userRole}
Portfolio Items: ${JSON.stringify(portfolioSummary)}

Respond ONLY with valid JSON:
{
  "overallScore": 85,
  "strengths": ["Strong visual consistency", "Great variety of work"],
  "improvements": ["Add more behind-the-scenes content", "Include client testimonials"],
  "trendingTips": ["Short-form video is trending in your niche", "Consider adding process videos"]
}`
          }],
          type: 'suggest'
        }
      });

      if (error) throw error;
      
      const parsed = JSON.parse(data?.content || '{}');
      setInsights(parsed);
    } catch (error) {
      console.error('AI insights error:', error);
      toast({
        title: "Couldn't generate insights",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Teaser for free users
  if (!isPro) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Portfolio Insights
            <Badge variant="outline" className="ml-auto text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <div className="space-y-2 blur-sm select-none">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Portfolio Score: 82/100</span>
              </div>
              <p className="text-xs text-muted-foreground">Your work shows strong visual...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-transparent">
              <Button size="sm" onClick={() => navigate("/subscription")} className="gap-2">
                <Lock className="h-3 w-3" />
                Unlock AI Insights
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Portfolio Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insights ? (
          <Button onClick={generateInsights} disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze My Portfolio
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Score: {insights.overallScore}/100</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setInsights(null)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Strengths
              </p>
              <div className="space-y-1">
                {insights.strengths.map((s, i) => (
                  <p key={i} className="text-sm text-green-600 dark:text-green-400">✓ {s}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Improvements
              </p>
              <div className="space-y-1">
                {insights.improvements.map((s, i) => (
                  <p key={i} className="text-sm text-amber-600 dark:text-amber-400">→ {s}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Trending in Your Niche
              </p>
              <div className="space-y-1">
                {insights.trendingTips.map((s, i) => (
                  <p key={i} className="text-sm text-primary">🔥 {s}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
