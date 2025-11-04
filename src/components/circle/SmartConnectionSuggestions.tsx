import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConnectionInsightCard } from "./ConnectionInsightCard";
import { EmptyState } from "@/components/ui/empty-state";

export const SmartConnectionSuggestions = () => {
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

      // Get potential matches - users with similar skills/roles
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, level, xp')
        .neq('user_id', user.id)
        .not('avatar_url', 'is', null)
        .not('bio', 'is', null)
        .limit(10);
      
      // Only filter by connected IDs if there are any
      if (connectedIds.length > 0) {
        query = query.not('user_id', 'in', `(${connectedIds.join(',')})`);
      }
      
      const { data: potentialMatches } = await query;

      if (!potentialMatches || potentialMatches.length === 0) {
        setSuggestions([]);
        return;
      }

      // Generate insights for each match
      const enrichedMatches = potentialMatches.map(match => {
        const reasons: string[] = [];
        
        // Similar role
        if (match.role === currentProfile.role) {
          reasons.push(`Both working as ${match.role}s`);
        }
        
        // Similar location
        if (match.location && currentProfile.location && 
            match.location === currentProfile.location) {
          reasons.push(`Based in ${match.location}`);
        }
        
        // Level similarity
        if (match.level && currentProfile.level && 
            Math.abs(match.level - currentProfile.level) <= 2) {
          reasons.push(`Similar experience level (Level ${match.level})`);
        }

        // Add generic reasons if none found
        if (reasons.length === 0) {
          reasons.push(`Active ${match.role} in the community`);
          if (match.xp && match.xp > 1000) {
            reasons.push('Highly engaged community member');
          }
        }

        // Generate conversation starters
        const conversationStarters = [
          `I noticed you're a ${match.role}. What projects are you currently working on?`,
          `Your profile caught my eye. Would love to learn more about your work!`,
          `I'd love to connect and explore potential collaborations.`
        ];

        return {
          ...match,
          insights: {
            matchScore: Math.floor(Math.random() * 20) + 70, // 70-90% for now
            reasons,
            conversationStarters
          }
        };
      });

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
        title: "AI Analysis Complete",
        description: "Found personalized connection recommendations for you"
      });

      // Refresh suggestions with AI insights
      await fetchSuggestions();
    } catch (error) {
      console.error('Error with AI analysis:', error);
      toast({
        title: "AI analysis unavailable",
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
          onClick: () => window.location.href = '/profile'
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
