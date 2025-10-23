import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FirstActionPromptProps {
  hasConnections: boolean;
  hasProjects: boolean;
  hasAppliedToOpportunity: boolean;
}

export function FirstActionPrompt({ 
  hasConnections, 
  hasProjects, 
  hasAppliedToOpportunity 
}: FirstActionPromptProps) {
  const navigate = useNavigate();

  // Don't show if user has already taken first actions
  if (hasConnections && (hasProjects || hasAppliedToOpportunity)) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-2 border-primary/20">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">🎉 Welcome to ThriveIN!</h3>
            <p className="text-sm text-muted-foreground">
              Your profile is set up. Now let's get you collaborating!
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Choose your first action:</p>
          
          {!hasConnections && (
            <Button 
              onClick={() => navigate('/discover')}
              variant="outline"
              className="w-full justify-between h-auto py-4"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Find Your First Connection</div>
                  <div className="text-xs text-muted-foreground">Browse creators & send connection requests</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {!hasAppliedToOpportunity && (
            <Button 
              onClick={() => navigate('/discover?tab=opportunities')}
              variant="outline"
              className="w-full justify-between h-auto py-4"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Explore Opportunities</div>
                  <div className="text-xs text-muted-foreground">Find paid projects & collaborations</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {hasConnections && !hasProjects && (
            <Button 
              onClick={() => navigate('/projects')}
              variant="gradient"
              className="w-full justify-between h-auto py-4"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Start Your First Project</div>
                  <div className="text-xs opacity-90">Collaborate with your connections</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Sparkles className="h-3 w-3" />
          <span>Each action earns you XP & helps you level up!</span>
        </div>
      </div>
    </Card>
  );
}
