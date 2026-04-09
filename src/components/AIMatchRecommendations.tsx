import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";

interface Match {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  bio: string | null;
  professional_skills: any[];
  compatibility_score: number;
  compatibility_reasons: string[];
}

export const AIMatchRecommendations = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [dismissedMatches, setDismissedMatches] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    analyzeMatches();
  }, []);

  const analyzeMatches = async () => {
    setAnalyzing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get current user's profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name, role, bio, professional_skills, passion_skills')
        .eq('user_id', user.id)
        .single();

      if (!myProfile) {
        setLoading(false);
        return;
      }

      // Get all other users' profiles (only public fields)
      const { data: otherProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, professional_skills, passion_skills')
        .neq('user_id', user.id)
        .limit(20);

      if (!otherProfiles || otherProfiles.length === 0) {
        setLoading(false);
        return;
      }

      // Use AI to analyze compatibility
      const { data: aiResponse, error } = await supabase.functions.invoke('generate-content', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Analyze compatibility between this user and potential matches for collaboration.

My Profile:
- Name: ${myProfile.full_name}
- Role: ${myProfile.role}
- Bio: ${myProfile.bio || 'No bio'}
- Skills: ${JSON.stringify(myProfile.professional_skills || [])}

Potential Matches:
${otherProfiles.map((p, i) => `
${i + 1}. ${p.full_name} (${p.role})
   Bio: ${p.bio || 'No bio'}
`).join('\n')}

For each potential match, provide a compatibility score (0-100) and 2-3 specific reasons why they'd be a good collaboration partner. Focus on complementary skills, shared interests, and collaboration potential.

Format as JSON array:
[
  {
    "index": 0,
    "score": 85,
    "reasons": ["Reason 1", "Reason 2", "Reason 3"]
  }
]`
            }
          ],
          type: 'suggest'
        }
      });

      if (error) throw error;

      // Parse AI response
      const aiMatches = aiResponse?.content ? JSON.parse(aiResponse.content) : [];
      
      // Combine with profile data and sort by score
      const enrichedMatches = aiMatches
        .map((match: any) => ({
          ...otherProfiles[match.index],
          compatibility_score: match.score,
          compatibility_reasons: match.reasons,
        }))
        .filter((m: any) => m.compatibility_score >= 60) // Only show 60%+ matches
        .sort((a: any, b: any) => b.compatibility_score - a.compatibility_score)
        .slice(0, 5); // Top 5 matches

      setMatches(enrichedMatches);
    } catch (error: any) {
      console.error('Error analyzing matches:', error);
      // Fallback to simple matching without AI
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url')
        .neq('user_id', user.id)
        .limit(5);

      if (fallbackProfiles) {
        setMatches(fallbackProfiles.map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          role: p.role,
          avatar_url: p.avatar_url,
          bio: p.bio,
          professional_skills: [],
          compatibility_score: 70,
          compatibility_reasons: ['Potential collaboration opportunity', 'Active in the community'],
        })));
      }
    }

    setLoading(false);
    setAnalyzing(false);
  };

  const handleConnect = async (matchUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Create a swipe/connection
      const { error } = await supabase
        .from('swipes')
        .insert({
          user_id: user.id,
          target_id: matchUserId,
          target_type: 'profile',
          direction: 'right',
        });

      if (error) throw error;

      toast({
        title: "Connection request sent!",
        description: "We'll notify you if they connect back",
      });

      // Remove from recommendations
      setDismissedMatches(prev => new Set([...prev, matchUserId]));
    } catch (error: any) {
      toast({
        title: "Failed to connect",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDismiss = (matchUserId: string) => {
    setDismissedMatches(prev => new Set([...prev, matchUserId]));
  };

  const visibleMatches = matches.filter(m => !dismissedMatches.has(m.user_id));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Match Recommendations
          </CardTitle>
          <CardDescription>Finding your ideal collaborators...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (visibleMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Match Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              Finding your ideal collaborators...
            </p>
            <Button variant="outline" size="sm" onClick={analyzeMatches} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Discover Matches
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Match Recommendations
            </CardTitle>
            <CardDescription>
              {visibleMatches.length} potential collaborator{visibleMatches.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={analyzeMatches} disabled={analyzing}>
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {visibleMatches.slice(0, 3).map((match, index) => (
            <Card key={match.user_id} className="p-4 relative overflow-hidden">
              {/* Blurred background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 backdrop-blur-sm" />
              
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Blurred avatar placeholder */}
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-sm" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm blur-sm select-none">
                          Match #{index + 1}
                        </span>
                        <Badge variant={match.compatibility_score >= 80 ? "default" : "secondary"} className="text-xs">
                          {match.compatibility_score}% Match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground blur-sm select-none">
                        Creative Professional
                      </p>
                    </div>
                  </div>
                </div>
                
                {match.compatibility_reasons && match.compatibility_reasons.length > 0 && (
                  <ul className="text-xs space-y-1.5 pl-1">
                    {match.compatibility_reasons.slice(0, 2).map((reason, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => navigate('/discover')}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Discover & Connect
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Head to Discover to see full profiles and connect
        </p>
      </CardContent>
    </Card>
  );
};
