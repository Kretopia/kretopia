import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, TrendingUp, Eye, Star, Lock, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AIPortfolioInsightsProps {
  portfolioItems: any[];
  userRole: string;
  isPro: boolean;
}

interface InsightItem {
  title: string;
  detail: string;
}

interface Insights {
  overallScore: number;
  summary: string;
  strengths: InsightItem[];
  improvements: InsightItem[];
  trendingTips: InsightItem[];
}

export function AIPortfolioInsights({ portfolioItems = [], userRole, isPro }: AIPortfolioInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const safePortfolioItems = portfolioItems || [];

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
            content: `Analyze this creator's portfolio and provide detailed, actionable insights. Be encouraging but specific with real examples.

Role: ${userRole}
Portfolio Items: ${JSON.stringify(portfolioSummary)}

Provide a thorough analysis with expandable details for each point.

Respond ONLY with valid JSON:
{
  "overallScore": 85,
  "summary": "Your portfolio shows strong creative direction with room to expand your range.",
  "strengths": [
    {"title": "Visual Consistency", "detail": "Your work maintains a cohesive aesthetic across pieces. This helps brands and collaborators instantly understand your style. Consider featuring this consistency prominently in your bio."},
    {"title": "Quality Over Quantity", "detail": "Each piece demonstrates attention to detail and professional execution. This signals reliability to potential collaborators."}
  ],
  "improvements": [
    {"title": "Add Behind-the-Scenes Content", "detail": "Creators who show their process get 40% more engagement. Consider adding work-in-progress shots, time-lapses, or brief explanations of your creative decisions."},
    {"title": "Diversify Media Types", "detail": "You currently have mostly images. Adding video content or audio samples could attract a wider range of collaboration opportunities."}
  ],
  "trendingTips": [
    {"title": "Short-Form Video is Booming", "detail": "In your niche, creators posting 15-60 second process videos are seeing 3x more profile views. Consider repurposing your portfolio pieces into quick, engaging clips."},
    {"title": "Collaboration Tags", "detail": "Tag collaborators in your portfolio descriptions. This builds social proof and can lead to cross-promotion opportunities."}
  ]
}`
          }],
          type: 'suggest'
        }
      });

      if (error) throw error;
      
      const raw = typeof data?.content === 'string' ? data.content : '{}';
      let parsed: Partial<Insights> = {};
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to parse AI insights JSON, using fallback structure', e, raw);
      }

      const normalizeItems = (items: any[]): InsightItem[] => {
        if (!Array.isArray(items)) return [];
        return items.map(item => {
          if (typeof item === 'string') {
            return { title: item, detail: '' };
          }
          return {
            title: typeof item.title === 'string' ? item.title : '',
            detail: typeof item.detail === 'string' ? item.detail : ''
          };
        });
      };

      const safeInsights: Insights = {
        overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 80,
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Your portfolio has been analyzed.',
        strengths: normalizeItems(parsed.strengths),
        improvements: normalizeItems(parsed.improvements),
        trendingTips: normalizeItems(parsed.trendingTips),
      };

      setInsights(safeInsights);
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
              <p className="text-xs text-muted-foreground">Your work shows strong visual consistency...</p>
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

  const renderExpandableSection = (
    items: InsightItem[],
    icon: React.ReactNode,
    label: string,
    colorClass: string,
    prefix: string,
    sectionKey: string
  ) => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <Collapsible
            key={i}
            open={expandedSections[`${sectionKey}-${i}`]}
            onOpenChange={() => toggleSection(`${sectionKey}-${i}`)}
          >
            <CollapsibleTrigger className="w-full text-left">
              <div className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors ${colorClass}`}>
                <span className="text-sm font-medium flex items-center gap-1">
                  <span>{prefix}</span> {item.title}
                </span>
                {item.detail && (
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections[`${sectionKey}-${i}`] ? 'rotate-180' : ''}`} />
                )}
              </div>
            </CollapsibleTrigger>
            {item.detail && (
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground px-2 py-2 bg-muted/30 rounded-b-lg border-t border-border/50">
                  {item.detail}
                </p>
              </CollapsibleContent>
            )}
          </Collapsible>
        ))}
      </div>
    </div>
  );

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

            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              {insights.summary}
            </p>

            {renderExpandableSection(
              insights.strengths,
              <Eye className="h-3 w-3" />,
              "Strengths",
              "text-green-600 dark:text-green-400",
              "✓",
              "strength"
            )}

            {renderExpandableSection(
              insights.improvements,
              <TrendingUp className="h-3 w-3" />,
              "Areas to Improve",
              "text-amber-600 dark:text-amber-400",
              "→",
              "improvement"
            )}

            {renderExpandableSection(
              insights.trendingTips,
              <TrendingUp className="h-3 w-3" />,
              "Trending in Your Niche",
              "text-primary",
              "🔥",
              "trend"
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}