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
    <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <EyeOff className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold">
        Your Profile is Hidden
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <p className="mb-3">
          Complete your profile to be discovered by other creators in the Connect page.
        </p>
        <div className="mb-3">
          <p className="font-medium mb-1">Missing:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
        <Button
          size="sm"
          variant="default"
          className="gap-2"
          onClick={() => {
            // Scroll to top of profile page
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Eye className="h-4 w-4" />
          Complete Profile Now
        </Button>
      </AlertDescription>
    </Alert>
  );
};
