import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileCompletionStatus } from "@/lib/profileCompletion";

interface ProfileCompletionBannerProps {
  completion: ProfileCompletionStatus;
  page?: "discover" | "opportunities" | "circle" | "messages";
}

const pageMessages = {
  discover: {
    title: "Boost Your Visibility! 👀",
    description: "Complete your profile to appear in more discovery feeds and get better matches.",
  },
  opportunities: {
    title: "Stand Out to Clients! 💼",
    description: "A complete profile increases your chances of landing opportunities by 3x.",
  },
  circle: {
    title: "Make Better Connections! 🤝",
    description: "Show your best self! Complete profiles get 5x more connection requests.",
  },
  messages: {
    title: "Start More Conversations! 💬",
    description: "A complete profile makes people more likely to message you first.",
  },
};

export const ProfileCompletionBanner = ({ completion, page = "discover" }: ProfileCompletionBannerProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  
  // Check if user dismissed this banner in this session
  useEffect(() => {
    const dismissedKey = `profile-banner-dismissed-${page}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setDismissed(true);
    }
  }, [page]);

  const handleDismiss = () => {
    const dismissedKey = `profile-banner-dismissed-${page}`;
    sessionStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  };

  // Don't show if profile is complete or dismissed
  if (completion.percentage === 100 || dismissed) {
    return null;
  }

  // Only show if profile is significantly incomplete (less than 70%)
  if (completion.percentage >= 70) {
    return null;
  }

  const message = pageMessages[page];
  const topMissing = completion.missingFields.slice(0, 2);

  return (
    <Alert className="border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10 mb-4 relative">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-sm mb-1">{message.title}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {message.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {topMissing.map((field) => (
              <span key={field} className="text-xs bg-background/80 px-2 py-0.5 rounded-full border">
                Add {field}
              </span>
            ))}
            {completion.missingFields.length > 2 && (
              <span className="text-xs text-muted-foreground px-2 py-0.5">
                +{completion.missingFields.length - 2} more
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1 h-8"
          >
            <Sparkles className="h-3 w-3" />
            Complete
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
