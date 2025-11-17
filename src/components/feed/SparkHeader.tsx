import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SparkHeaderProps {
  onShowSavedSparks: () => void;
}

export const SparkHeader = ({ onShowSavedSparks }: SparkHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Spark
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover inspiring work from creators
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onShowSavedSparks}
        className="gap-2"
      >
        <Paperclip className="h-4 w-4" />
        Clipped
      </Button>
    </div>
  );
};
