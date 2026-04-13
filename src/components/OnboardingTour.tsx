import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles, User, Search, Heart, MessageSquare, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  route?: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to ThriveIN!",
    description: "Your creative career starts here. Let's show you around — it only takes a minute.",
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    action: "Let's Go",
  },
  {
    title: "Build Your Profile",
    description: "Add your skills, credits, and portfolio. A complete profile gets you 5x more visibility to collaborators and clients.",
    icon: <User className="h-8 w-8 text-primary" />,
    action: "Set Up Profile",
    route: "/profile",
  },
  {
    title: "Discover & Browse",
    description: "Search for creators, events, gigs, and opportunities. Use Explore mode to discover what's happening in the creative world.",
    icon: <Search className="h-8 w-8 text-primary" />,
    action: "Start Exploring",
    route: "/circle",
  },
  {
    title: "Swipe & Match",
    description: "Find your next collaborator with smart matching. Swipe right to connect, and start creating together.",
    icon: <Heart className="h-8 w-8 text-primary" />,
    action: "Try Matching",
    route: "/circle",
  },
  {
    title: "Message & Collaborate",
    description: "When you match, start a conversation. Use The Desk for project management, file sharing, and team coordination.",
    icon: <MessageSquare className="h-8 w-8 text-primary" />,
  },
  {
    title: "You're Ready to Thrive!",
    description: "Your creative toolkit is set up. Start connecting, claim your credits, and build your reputation.",
    icon: <Briefcase className="h-8 w-8 text-primary" />,
    action: "Get Started",
  },
];

export const OnboardingTour = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

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
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-muted-foreground">
              {currentStep + 1} / {tourSteps.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8 -mt-1 -mr-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex gap-1 mb-6">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Icon + Content */}
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {step.icon}
            </div>
            <h2 className="text-xl font-bold">{step.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">{step.description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>

            <div className="flex gap-2">
              {!isLastStep && (
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Skip
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="gap-1">
                {step.action || "Next"}
                {!isLastStep && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
