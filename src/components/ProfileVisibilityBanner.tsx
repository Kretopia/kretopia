import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileVisibilityBannerProps {
  isVisible: boolean;
  missingFields: string[];
}

export const ProfileVisibilityBanner = ({ isVisible, missingFields }: ProfileVisibilityBannerProps) => {
  const navigate = useNavigate();

  if (isVisible) {
    return null; // Profile is complete and visible
  }

  return (
    <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20 animate-in slide-in-from-top">
      <EyeOff className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold flex items-center gap-2">
        Your Profile is Hidden from Discovery
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <p className="mb-3 font-medium">
          ⚠️ Other creators can't find you in Discover or Connect until you complete these fields:
        </p>
        <div className="mb-4 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg p-3">
          <p className="font-semibold mb-2 text-sm">Required to be visible:</p>
          <ul className="space-y-2">
            {missingFields.map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-600"></span>
                <span className="font-medium">{field}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-start gap-2 mb-3 text-sm bg-white/50 dark:bg-black/20 rounded p-2">
          <Eye className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Why this matters:</strong> Complete profiles get 10x more views and 5x more connection requests.
          </p>
        </div>
        <Button
          size="sm"
          variant="default"
          className="gap-2 w-full sm:w-auto"
          onClick={() => navigate('/profile')}
        >
          <Eye className="h-4 w-4" />
          Complete Profile Now (+50 XP)
        </Button>
      </AlertDescription>
    </Alert>
  );
};
