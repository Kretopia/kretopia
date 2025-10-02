import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileStrengthScoreProps {
  profile: Profile;
  portfolioCount?: number;
  creditsCount?: number;
  awardsCount?: number;
  pressCount?: number;
}

interface CompletionItem {
  label: string;
  completed: boolean;
  points: number;
}

export const calculateProfileStrength = (
  profile: Profile,
  portfolioCount: number = 0,
  creditsCount: number = 0,
  awardsCount: number = 0,
  pressCount: number = 0
): { score: number; items: CompletionItem[] } => {
  const items: CompletionItem[] = [
    { label: "Profile photo", completed: !!profile.avatar_url, points: 10 },
    { label: "Full name", completed: !!profile.full_name, points: 5 },
    { label: "Bio (50+ characters)", completed: (profile.bio?.length || 0) >= 50, points: 10 },
    { label: "Location", completed: !!profile.location, points: 5 },
    { label: "Role/Title", completed: !!profile.role, points: 5 },
    { label: "Professional skills (3+)", completed: Array.isArray(profile.professional_skills) && profile.professional_skills.length >= 3, points: 15 },
    { label: "Portfolio items (3+)", completed: portfolioCount >= 3, points: 15 },
    { label: "Project credits (2+)", completed: creditsCount >= 2, points: 10 },
    { label: "Social stats verified", completed: !!profile.verified_metrics, points: 10 },
    { label: "At least one social link", completed: !!(profile.instagram_url || profile.twitter_url || profile.linkedin_url || profile.website), points: 5 },
    { label: "Awards or recognition", completed: awardsCount > 0, points: 5 },
    { label: "Press/media coverage", completed: pressCount > 0, points: 5 },
  ];

  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
  const earnedPoints = items.filter(i => i.completed).reduce((sum, item) => sum + item.points, 0);
  const score = Math.round((earnedPoints / totalPoints) * 100);

  return { score, items };
};

export const ProfileStrengthScore = ({ 
  profile, 
  portfolioCount = 0, 
  creditsCount = 0,
  awardsCount = 0,
  pressCount = 0
}: ProfileStrengthScoreProps) => {
  const { score, items } = calculateProfileStrength(profile, portfolioCount, creditsCount, awardsCount, pressCount);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Outstanding! Your profile is highly attractive to collaborators.";
    if (score >= 70) return "Great job! A few more touches to perfect your profile.";
    if (score >= 50) return "Good start! Complete more sections to stand out.";
    return "Let's build your profile! Complete the key sections below.";
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Profile Strength
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
          <div className="flex-1">
            <Progress value={score} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {getScoreMessage(score)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Profile Checklist</h4>
          <div className="grid gap-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={item.completed ? "text-muted-foreground line-through" : ""}>
                  {item.label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  +{item.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
