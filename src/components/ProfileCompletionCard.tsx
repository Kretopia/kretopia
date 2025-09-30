import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileCompletionStatus } from "@/lib/profileCompletion";

interface ProfileCompletionCardProps {
  completion: ProfileCompletionStatus;
}

export const ProfileCompletionCard = ({ completion }: ProfileCompletionCardProps) => {
  const navigate = useNavigate();

  if (completion.percentage === 100) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Complete Your Profile</h3>
          <span className="text-2xl font-bold text-primary">{completion.percentage}%</span>
        </div>
        
        <Progress value={completion.percentage} className="h-2" />
        
        <div className="space-y-2">
          {completion.completedFields.map((field) => (
            <div key={field} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{field}</span>
            </div>
          ))}
          {completion.missingFields.map((field) => (
            <div key={field} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Circle className="h-4 w-4" />
              <span>{field}</span>
            </div>
          ))}
        </div>

        <Button 
          onClick={() => navigate('/profile')} 
          className="w-full"
          variant="default"
        >
          Complete Profile (+50 XP)
        </Button>
      </div>
    </Card>
  );
};
