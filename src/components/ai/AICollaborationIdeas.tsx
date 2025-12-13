import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, Lock, Loader2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AICollaborationIdeasProps {
  currentUser: {
    full_name: string;
    role: string;
    professional_skills?: string[];
  };
  matchedUser: {
    full_name: string;
    role: string;
    professional_skills?: string[];
  };
  isPro: boolean;
}

interface CollabIdea {
  title: string;
  description: string;
  timeline: string;
}

export function AICollaborationIdeas({ currentUser, matchedUser, isPro }: AICollaborationIdeasProps) {
  const [ideas, setIdeas] = useState<CollabIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateIdeas = async () => {
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
            content: `Generate 3 specific collaboration project ideas for these two creators:

Creator 1: ${currentUser.full_name} - ${currentUser.role}
Skills: ${currentUser.professional_skills?.join(', ') || 'Not specified'}

Creator 2: ${matchedUser.full_name} - ${matchedUser.role}
Skills: ${matchedUser.professional_skills?.join(', ') || 'Not specified'}

Make ideas specific, actionable, and exciting. Consider how their skills complement each other.

Respond ONLY with valid JSON array:
[
  {"title": "Project Title", "description": "Brief exciting description", "timeline": "2-4 weeks"},
  {"title": "Project Title", "description": "Brief exciting description", "timeline": "1 week"}
]`
          }],
          type: 'suggest'
        }
      });

      if (error) throw error;
      
      const parsed = JSON.parse(data?.content || '[]');
      setIdeas(parsed);
    } catch (error) {
      console.error('AI collab ideas error:', error);
      toast({
        title: "Couldn't generate ideas",
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
      <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-accent" />
            AI Collaboration Ideas
            <Badge variant="outline" className="ml-auto text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <div className="space-y-2 blur-sm select-none">
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-sm font-medium">Music Video Collaboration</p>
                <p className="text-xs text-muted-foreground">Combine your skills to create...</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-transparent">
              <Button size="sm" onClick={() => navigate("/subscription")} className="gap-2">
                <Lock className="h-3 w-3" />
                Unlock Collab Ideas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-accent" />
          AI Collaboration Ideas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ideas ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Get AI-powered project ideas tailored to both your skills
            </p>
            <Button onClick={generateIdeas} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Brainstorming...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Ideas
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-1">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    {idea.title}
                  </p>
                  <Badge variant="secondary" className="text-xs">{idea.timeline}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{idea.description}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setIdeas(null)} className="w-full">
              Generate More Ideas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
