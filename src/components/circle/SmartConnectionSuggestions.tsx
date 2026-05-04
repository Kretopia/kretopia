import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConnectionInsightCard } from "./ConnectionInsightCard";
import { EmptyState } from "@/components/ui/empty-state";
import { intentBoostForCreator } from "@/lib/intentMatching";

export const SmartConnectionSuggestions = () => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      // Get existing connections
      const { data: connections } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', user.id);

      const connectedIds = connections?.map(c => c.connected_user_id) || [];

      // Get potential matches - users with profiles
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, level, xp, professional_skills, primary_intent, primary_intents')
        .neq('user_id', user.id)
        .eq('onboarding_completed', true)
        .not('avatar_url', 'is', null)
        .limit(20);
      
      // Only filter by connected IDs if there are any
      if (connectedIds.length > 0) {
        query = query.not('user_id', 'in', `(${connectedIds.join(',')})`);
      }
      
      const { data: potentialMatches } = await query;

      if (!potentialMatches || potentialMatches.length === 0) {
        setSuggestions([]);
        return;
      }

      // Parse current user's skills
      const currentSkills = new Set<string>();
      if (Array.isArray(currentProfile.professional_skills)) {
        currentProfile.professional_skills.forEach((s: any) => {
          if (typeof s === 'string') currentSkills.add(s.toLowerCase());
          else if (s?.skill) currentSkills.add(s.skill.toLowerCase());
        });
      }

      // Generate insights for each match with real scoring
      const enrichedMatches = potentialMatches.map(match => {
        const reasons: string[] = [];
        let score = 50; // base score
        
        // Skills overlap (strongest signal)
        const matchSkills: string[] = [];
        if (Array.isArray(match.professional_skills)) {
          match.professional_skills.forEach((s: any) => {
            const skill = typeof s === 'string' ? s : s?.skill;
            if (skill) matchSkills.push(skill);
          });
        }
        const overlap = matchSkills.filter(s => currentSkills.has(s.toLowerCase()));
        if (overlap.length > 0) {
          score += overlap.length * 10;
          reasons.push(`Shares ${overlap.length} skill${overlap.length > 1 ? 's' : ''}: ${overlap.slice(0, 2).join(', ')}`);
        }

        // Complementary roles (designer + developer, etc.)
        const complementaryPairs: Record<string, string[]> = {
          'designer': ['developer', 'photographer', 'content creator'],
          'developer': ['designer', 'marketer'],
          'photographer': ['videographer', 'designer', 'model'],
          'videographer': ['photographer', 'music producer', 'editor'],
          'music producer': ['singer', 'rapper', 'dj'],
        };
        const currentRoleLower = (currentProfile.role || '').toLowerCase();
        const matchRoleLower = (match.role || '').toLowerCase();
        if (complementaryPairs[currentRoleLower]?.some(r => matchRoleLower.includes(r))) {
          score += 15;
          reasons.push(`Complementary roles: ${currentProfile.role} + ${match.role}`);
        }
        
        // Same role
        if (match.role === currentProfile.role) {
          score += 8;
          reasons.push(`Both working as ${match.role}s`);
        }
        
        // Same location
        if (match.location && currentProfile.location && match.location === currentProfile.location) {
          score += 12;
          reasons.push(`Based in ${match.location}`);
        }
        
        // Level similarity
        if (match.level && currentProfile.level && Math.abs(match.level - currentProfile.level) <= 2) {
          score += 5;
          reasons.push(`Similar experience level`);
        }

        // Active user bonus
        if (match.xp && match.xp > 500) {
          score += 5;
        }

        // Intent boost — complementary intents (gigs↔hire, collab↔collab, fund↔collab)
        const intentResult = intentBoostForCreator(
          (currentProfile as any).primary_intents ?? (currentProfile as any).primary_intent,
          (match as any).primary_intents ?? (match as any).primary_intent
        );
        if (intentResult.boost > 0) {
          score += intentResult.boost;
          if (intentResult.reason) reasons.unshift(intentResult.reason);
        }

        if (reasons.length === 0) {
          reasons.push(`Active ${match.role || 'creator'} in the community`);
        }

        const conversationStarters = [
          `Hey ${match.full_name?.split(' ')[0]}, I'm a ${currentProfile.role} — would love to connect!`,
          overlap.length > 0 ? `I see you're also into ${overlap[0]}. Let's chat!` : `Your profile caught my eye. Would love to collaborate!`,
          `I'd love to connect and explore potential collaborations.`
        ];

        return {
          ...match,
          insights: {
            matchScore: Math.min(score, 99),
            reasons,
            conversationStarters
          }
        };
      });

      // Sort by score descending
      enrichedMatches.sort((a, b) => b.insights.matchScore - a.insights.matchScore);
      setSuggestions(enrichedMatches.slice(0, 6));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user profile for AI analysis
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      // Call AI to analyze and score matches
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: `Analyze this user profile and suggest why they should connect with others:
          
User: ${currentProfile.full_name}
Role: ${currentProfile.role}
Bio: ${currentProfile.bio || 'Not provided'}
Skills: ${Array.isArray(currentProfile.professional_skills) ? currentProfile.professional_skills.join(', ') : 'Not provided'}

Return top 3 reasons why this user would benefit from expanding their network in JSON format:
{
  "reasons": ["reason1", "reason2", "reason3"]
}`,
          model: 'google/gemini-2.5-flash'
        }
      });

      if (error) throw error;

      toast({
        title: "Match analysis complete",
        description: "Found personalized connection recommendations for you"
      });

      // Refresh suggestions with AI insights
      await fetchSuggestions();
    } catch (error) {
      console.error('Error with AI analysis:', error);
      toast({
        title: "Match analysis unavailable",
        description: "Showing standard recommendations",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConnect = async (profile: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          connected_user_id: profile.user_id,
          status: 'pending'
        });

      if (error) throw error;

      // Track connection request
      const { analytics } = await import("@/lib/analytics");
      analytics.connectionRequest(profile.user_id);

      toast({ 
        title: `Request sent to ${profile.full_name}`,
        description: "They'll be notified of your connection request"
      });

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.user_id !== profile.user_id));
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No suggestions right now"
        description="Complete your profile to get personalized connection recommendations"
        action={{
          label: "Complete Profile",
          onClick: () => navigate('/onboarding')
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Smart Connections</h3>
              <p className="text-xs text-muted-foreground">
                Curated matches based on your profile
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={analyzeWithAI}
            disabled={analyzing}
            className="gap-2"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI Analyze
          </Button>
        </div>
      </Card>

      {/* Suggestions Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {suggestions.map((suggestion) => (
          <ConnectionInsightCard
            key={suggestion.user_id}
            profile={suggestion}
            insights={suggestion.insights}
            onConnect={handleConnect}
          />
        ))}
      </div>
    </div>
  );
};
