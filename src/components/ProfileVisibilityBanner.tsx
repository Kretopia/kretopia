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
    <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20 animate-in slide-in-from-top shadow-lg">
      <EyeOff className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold flex items-center gap-2 text-base">
        🔒 Your Profile is Hidden from Discovery
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <p className="mb-3 font-semibold text-sm">
          Your profile won't appear in Discover until you complete it. We focus on quality over quantity.
        </p>
        <div className="mb-4 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
          <p className="font-semibold mb-2 text-sm">Missing requirements:</p>
          <ul className="space-y-1.5">
            {missingFields.map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-600 flex-shrink-0"></span>
                <span className="font-medium">{field}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-start gap-2 mb-4 text-xs bg-blue-50/50 dark:bg-blue-950/20 rounded p-2.5 border border-blue-200 dark:border-blue-900">
          <Eye className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
          <p className="text-blue-900 dark:text-blue-100">
            <strong>Professional standards:</strong> Complete profiles attract serious collaborators and get 10x more visibility.
          </p>
        </div>
        <Button
          size="sm"
          variant="default"
          className="gap-2 w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
          onClick={() => navigate('/profile')}
        >
          <Eye className="h-4 w-4" />
          Complete Profile to Get Discovered (+50 XP)
        </Button>
      </AlertDescription>
    </Alert>
  );
};
