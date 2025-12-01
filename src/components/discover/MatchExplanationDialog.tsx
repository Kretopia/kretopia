import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, MapPin, Briefcase, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MatchExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    user_id?: string;
    name: string;
    title: string;
    location: string;
    image: string;
    matchScore?: number;
    matchReasons?: string[];
    ai_match_score?: number;
    match_reasons?: string[];
  };
  onConnect: () => void;
  onPass: () => void;
}

export const MatchExplanationDialog = ({ 
  open, 
  onOpenChange, 
  match,
  onConnect,
  onPass
}: MatchExplanationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiReasons, setAiReasons] = useState<string[]>([]);
  
  const score = aiScore || match.matchScore || match.ai_match_score || 85;
  const reasons = aiReasons.length > 0 ? aiReasons : (match.matchReasons || match.match_reasons || []);

  // Generate AI explanation when dialog opens
  useEffect(() => {
    const generateExplanation = async () => {
      if (!open || !match.user_id || (aiReasons.length > 0)) return;
      
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get current user profile
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('user_id, full_name, role, bio, professional_skills, location')
          .eq('user_id', user.id)
          .single();

        // Get target user profile
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('user_id, full_name, role, bio, professional_skills, location')
          .eq('user_id', match.user_id)
          .single();

        if (!currentProfile || !targetProfile) return;

        // Call AI edge function
        const { data: aiMatch } = await supabase.functions.invoke('generate-match-explanation', {
          body: {
            currentUser: currentProfile,
            targetUser: targetProfile
          }
        });

        if (aiMatch) {
          setAiScore(aiMatch.score || 85);
          setAiReasons(aiMatch.reasons || []);
        }
      } catch (error) {
        console.error('[MatchExplanationDialog] Error generating AI explanation:', error);
        // Use placeholder on error
        setAiReasons(["Great collaboration potential", "Complementary skills", "Similar interests"]);
      } finally {
        setLoading(false);
      }
    };

    generateExplanation();
  }, [open, match.user_id]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "from-green-500 to-emerald-500";
    if (score >= 70) return "from-blue-500 to-cyan-500";
    return "from-purple-500 to-pink-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Perfect Match";
    if (score >= 70) return "Great Match";
    return "Good Match";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Why This Match?
          </DialogTitle>
          <DialogDescription>
            AI-powered compatibility analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-14 w-14">
              <AvatarImage src={match.image} alt={match.name} />
              <AvatarFallback>{match.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{match.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <Briefcase className="h-3 w-3" />
                {match.title}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {match.location}
              </p>
            </div>
          </div>

          {/* Match Score */}
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${getScoreColor(score)} text-white`}>
              <div className="text-3xl font-bold">{score}%</div>
            </div>
            <p className="text-sm font-medium">{getScoreLabel(score)}</p>
          </div>

          {/* Match Reasons */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Why you'll work great together:
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ul className="space-y-2">
                {reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-primary/5">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                onPass();
                onOpenChange(false);
              }}
            >
              Pass
            </Button>
            <Button 
              variant="gradient" 
              className="flex-1"
              onClick={() => {
                onConnect();
                onOpenChange(false);
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Connect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
