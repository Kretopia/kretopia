import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SmartMatchBadgeProps {
  opportunityId: string;
  opportunityTitle: string;
  opportunitySkills: string[];
  userSkills: any[];
}

export const SmartOpportunityMatch = ({ 
  opportunityId, 
  opportunityTitle, 
  opportunitySkills, 
  userSkills 
}: SmartMatchBadgeProps) => {
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateMatch = async () => {
    if (matchScore !== null || loading) return;
    
    setLoading(true);
    try {
      const mySkillsList = [
        ...(Array.isArray(userSkills) ? userSkills : Object.keys(userSkills || {}))
      ];

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Rate how well this user matches this opportunity (0-100):

OPPORTUNITY: ${opportunityTitle}
Required skills: ${opportunitySkills.join(', ')}

USER SKILLS: ${mySkillsList.join(', ')}

Consider:
- Direct skill matches
- Transferable skills
- Skill gaps
- Overall fit

Return ONLY a number 0-100.`
            }
          ]
        }
      });

      if (error) throw error;

      const score = parseInt(data?.content || '50');
      setMatchScore(score);
    } catch (error) {
      console.error('Match calculation error:', error);
      setMatchScore(50);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate on mount
  useState(() => {
    calculateMatch();
  });

  if (!matchScore || matchScore < 60) return null;

  const getMatchColor = (score: number) => {
    if (score >= 85) return "text-green-600 dark:text-green-400 border-green-500";
    if (score >= 70) return "text-blue-600 dark:text-blue-400 border-blue-500";
    return "text-yellow-600 dark:text-yellow-400 border-yellow-500";
  };

  const getMatchLabel = (score: number) => {
    if (score >= 85) return "Perfect Match";
    if (score >= 70) return "Great Match";
    return "Good Match";
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getMatchColor(matchScore)} border-2 font-semibold`}
    >
      <Sparkles className="h-3 w-3 mr-1" />
      {getMatchLabel(matchScore)} {matchScore}%
    </Badge>
  );
};
