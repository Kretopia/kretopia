import { useNavigate } from "react-router-dom";
import { useNavMode, NavMode } from "@/hooks/useNavMode";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrossModeNudgeProps {
  /** The mode to switch TO */
  targetMode: NavMode;
  /** CTA label */
  label: string;
  /** Path to navigate to after switching */
  targetPath?: string;
  /** Extra styling */
  className?: string;
}

/**
 * A subtle CTA that switches the user to the other mode.
 * Example: "Hire this creator →" on a profile in Create mode → switches to Work.
 */
export function CrossModeNudge({ targetMode, label, targetPath, className }: CrossModeNudgeProps) {
  const navigate = useNavigate();
  const { mode, setMode } = useNavMode();

  // Only show if we're NOT already in the target mode
  if (mode === targetMode) return null;

  const handleClick = () => {
    setMode(targetMode);
    if (targetPath) navigate(targetPath);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all",
        className
      )}
    >
      <ArrowRightLeft className="h-3 w-3" />
      {label}
    </Button>
  );
}
