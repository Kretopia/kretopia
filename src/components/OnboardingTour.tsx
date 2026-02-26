import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  title: string;
  description: string;
  action?: string;
  route?: string;
  highlight?: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to ThriveHub! 🎉",
    description: "Let's take a quick tour to help you get started and make the most of the platform.",
    action: "Start Tour",
  },
  {
    title: "Complete Your Profile",
    description: "A complete profile helps you get better matches and opportunities. Add your skills, portfolio, and experience.",
    action: "Go to Profile",
    route: "/profile",
  },
  {
    title: "Discover Opportunities",
    description: "Swipe through opportunities that match your skills. Swipe right to show interest, left to pass.",
    action: "Explore Opportunities",
    route: "/discover?tab=opportunities",
  },
  {
    title: "Find Collaborators",
    description: "Connect with other creators. Match with people who complement your skills and vision.",
    action: "Meet Creators",
    route: "/discover?tab=creators",
  },
  {
    title: "Your Network",
    description: "View your matches, send messages, and start collaborating on projects together.",
    action: "View Circle",
    route: "/circle",
  },
  {
    title: "You're All Set! ✨",
    description: "You're ready to thrive! Start connecting, collaborating, and creating amazing things.",
    action: "Get Started",
  },
];

export const OnboardingTour = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (profile && !profile.onboarding_completed) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  const handleNext = () => {
    const step = tourSteps[currentStep];
    
    if (step.route) {
      navigate(step.route);
    }

    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = async () => {
    setIsVisible(false);
    
    if (userId) {
      try {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("user_id", userId);
      } catch (error) {
        console.error("Error completing onboarding:", error);
      }
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-primary/20 shadow-xl">
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {tourSteps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-secondary rounded-full h-2 mb-6">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <h2 className="text-2xl font-bold">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-2">
              {!isLastStep && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip Tour
                </Button>
              )}
              <Button onClick={handleNext} className="gap-2">
                {step.action || "Next"}
                {!isLastStep && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
