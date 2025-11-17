import { Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SparkEmptyStateProps {
  tab: 'for-you' | 'following';
}

export const SparkEmptyState = ({ tab }: SparkEmptyStateProps) => {
  const navigate = useNavigate();

  if (tab === 'following') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No content yet</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Connect with creators to see their content here
        </p>
        <Button onClick={() => navigate('/circle')}>
          Discover Creators
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No content yet</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        Be the first to share your work!
      </p>
    </div>
  );
};
