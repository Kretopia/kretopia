import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Target, CheckCircle, AlertCircle, Lock, Loader2 } from "lucide-react";
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

interface Optimization {
  score: number;
  completed: string[];
  suggestions: string[];
  priority: string;
}

export function AIProfileOptimizer({ profile, portfolioCount, isPro }: AIProfileOptimizerProps) {
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
            content: `Analyze this creator profile and provide optimization tips to improve visibility and attract collaborators.

Profile:
- Name: ${profile.full_name || 'Not set'}
- Role: ${profile.role || 'Not set'}
- Bio: ${profile.bio || 'Not set'}
- Location: ${profile.location || 'Not set'}
- Skills: ${profile.professional_skills?.join(', ') || 'None'}
- Avatar: ${profile.avatar_url ? 'Yes' : 'No'}
- Portfolio Items: ${portfolioCount}

Score the profile (0-100) and provide specific, actionable suggestions.

Respond ONLY with valid JSON:
{
  "score": 75,
  "completed": ["Professional photo uploaded", "Clear role defined"],
  "suggestions": ["Add 3+ portfolio items to showcase range", "Write a bio highlighting your unique value"],
  "priority": "Your bio is missing - this is the first thing collaborators read!"
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

      const safeOptimization: Optimization = {
        score: typeof parsed.score === 'number' ? parsed.score : 75,
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        priority: typeof parsed.priority === 'string' ? parsed.priority : '',
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

            {optimization.priority && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Priority: {optimization.priority}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Completed</p>
              <div className="space-y-1">
                {(optimization.completed || []).map((item, i) => (
                  <p key={i} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> {item}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
              <div className="space-y-1">
                {(optimization.suggestions || []).map((item, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary">
                      →
                    </span>{' '}
                    {item}
                  </p>
                ))}
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
