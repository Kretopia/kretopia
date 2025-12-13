import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, Target, CheckCircle, AlertCircle, Lock, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AIProfileOptimizerProps {
  profile: {
    full_name?: string;
    role?: string;
    bio?: string;
    professional_skills?: string[];
    avatar_url?: string;
    location?: string;
  };
  portfolioCount: number;
  isPro: boolean;
}

interface OptimizationItem {
  title: string;
  detail: string;
}

interface Optimization {
  score: number;
  summary: string;
  priority: OptimizationItem;
  completed: OptimizationItem[];
  suggestions: OptimizationItem[];
}

export function AIProfileOptimizer({ profile, portfolioCount, isPro }: AIProfileOptimizerProps) {
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const analyzeProfile = async () => {
    if (!isPro) {
      navigate("/subscription");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          messages: [{
            role: 'user',
            content: `Analyze this creator profile and provide detailed optimization tips to improve visibility and attract collaborators.

Profile:
- Name: ${profile.full_name || 'Not set'}
- Role: ${profile.role || 'Not set'}
- Bio: ${profile.bio || 'Not set'}
- Location: ${profile.location || 'Not set'}
- Skills: ${profile.professional_skills?.join(', ') || 'None'}
- Avatar: ${profile.avatar_url ? 'Yes' : 'No'}
- Portfolio Items: ${portfolioCount}

Score the profile (0-100) and provide specific, actionable suggestions with detailed explanations.

Respond ONLY with valid JSON:
{
  "score": 75,
  "summary": "Your profile has strong foundations but needs optimization to stand out in a competitive creator landscape.",
  "priority": {
    "title": "Bio Needs Work",
    "detail": "Your bio is the first thing collaborators read. It should hook them in the first line, clearly state what you do, who you work with, and what makes you unique. Consider: 'Award-winning cinematographer helping brands tell visual stories that convert.'"
  },
  "completed": [
    {"title": "Professional Photo", "detail": "A high-quality avatar builds instant trust. Studies show profiles with professional photos get 14x more views."},
    {"title": "Clear Role Defined", "detail": "Your role helps the matching algorithm connect you with relevant collaborators. This is properly set."}
  ],
  "suggestions": [
    {"title": "Add 3+ Portfolio Items", "detail": "Profiles with at least 5 portfolio pieces get 3x more collaboration requests. Show variety in your work while maintaining quality."},
    {"title": "Highlight Your Unique Value", "detail": "What makes you different from other creators in your field? Add specific achievements, notable clients, or unique processes to your bio."},
    {"title": "Complete Your Skills", "detail": "Add 5-8 relevant skills. This helps with search visibility and AI matching. Be specific: 'Color Grading' is better than just 'Video Editing'."}
  ]
}`
          }],
          type: 'suggest'
        }
      });

      if (error) throw error;
      
      const raw = typeof data?.content === 'string' ? data.content : '{}';
      let parsed: Partial<Optimization> = {};
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to parse AI optimizer JSON, using fallback structure', e, raw);
      }

      const normalizeItems = (items: any[]): OptimizationItem[] => {
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

      const normalizePriority = (priority: any): OptimizationItem => {
        if (!priority) return { title: '', detail: '' };
        if (typeof priority === 'string') {
          return { title: priority, detail: '' };
        }
        return {
          title: typeof priority.title === 'string' ? priority.title : '',
          detail: typeof priority.detail === 'string' ? priority.detail : ''
        };
      };

      const safeOptimization: Optimization = {
        score: typeof parsed.score === 'number' ? parsed.score : 75,
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Your profile has been analyzed.',
        priority: normalizePriority(parsed.priority),
        completed: normalizeItems(parsed.completed),
        suggestions: normalizeItems(parsed.suggestions),
      };

      setOptimization(safeOptimization);
    } catch (error) {
      console.error('AI optimizer error:', error);
      toast({
        title: "Couldn't analyze profile",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Teaser for free users - show partial score
  if (!isPro) {
    // Calculate basic score locally for teaser
    let basicScore = 0;
    if (profile.avatar_url) basicScore += 20;
    if (profile.bio && profile.bio.length > 20) basicScore += 20;
    if (profile.role) basicScore += 15;
    if (portfolioCount > 0) basicScore += Math.min(portfolioCount * 10, 30);
    if (profile.professional_skills?.length) basicScore += 15;

    return (
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-yellow-500" />
            Profile Optimizer
            <Badge variant="outline" className="ml-auto text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Profile Strength</span>
              <span className="font-medium">{basicScore}%</span>
            </div>
            <Progress value={basicScore} className="h-2" />
          </div>
          
          <div className="relative">
            <div className="space-y-2 blur-sm select-none">
              <p className="text-xs text-green-600">✓ Avatar uploaded</p>
              <p className="text-xs text-amber-600">→ Add more portfolio items</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-transparent">
              <Button size="sm" onClick={() => navigate("/subscription")} className="gap-2">
                <Lock className="h-3 w-3" />
                Get AI Tips
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderExpandableItem = (item: OptimizationItem, index: number, sectionKey: string, icon: React.ReactNode, colorClass: string) => (
    <Collapsible
      key={index}
      open={expandedSections[`${sectionKey}-${index}`]}
      onOpenChange={() => toggleSection(`${sectionKey}-${index}`)}
    >
      <CollapsibleTrigger className="w-full text-left">
        <div className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors`}>
          <span className={`text-sm font-medium flex items-center gap-1 ${colorClass}`}>
            {icon} {item.title}
          </span>
          {item.detail && (
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections[`${sectionKey}-${index}`] ? 'rotate-180' : ''}`} />
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
  );

  return (
    <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-yellow-500" />
          AI Profile Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!optimization ? (
          <Button onClick={analyzeProfile} disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Optimize My Profile
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Profile Strength</span>
                <span className="font-semibold">{optimization.score}%</span>
              </div>
              <Progress value={optimization.score} className="h-2" />
            </div>

            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              {optimization.summary}
            </p>

            {optimization.priority?.title && (
              <Collapsible
                open={expandedSections['priority']}
                onOpenChange={() => toggleSection('priority')}
              >
                <CollapsibleTrigger className="w-full text-left">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/15 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Priority: {optimization.priority.title}
                      </p>
                      {optimization.priority.detail && (
                        <ChevronDown className={`h-4 w-4 text-amber-500 transition-transform ${expandedSections['priority'] ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                {optimization.priority.detail && (
                  <CollapsibleContent>
                    <p className="text-xs text-muted-foreground px-3 py-2 bg-amber-500/5 rounded-b-lg border-x border-b border-amber-500/20">
                      {optimization.priority.detail}
                    </p>
                  </CollapsibleContent>
                )}
              </Collapsible>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Completed</p>
              <div className="space-y-1">
                {(optimization.completed || []).map((item, i) => 
                  renderExpandableItem(
                    item, 
                    i, 
                    'completed',
                    <CheckCircle className="h-3 w-3" />,
                    "text-green-600 dark:text-green-400"
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
              <div className="space-y-1">
                {(optimization.suggestions || []).map((item, i) => 
                  renderExpandableItem(
                    item, 
                    i, 
                    'suggestion',
                    <span className="text-primary">→</span>,
                    "text-foreground"
                  )
                )}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setOptimization(null)} className="w-full">
              Re-analyze Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}