import { Button } from "@/components/ui/button";
import { RotateCcw, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UndoSwipeButtonProps {
  onClick: () => void;
  disabled: boolean;
  userTier: string;
  undosRemaining: number;
}

export const UndoSwipeButton = ({ onClick, disabled, userTier, undosRemaining }: UndoSwipeButtonProps) => {
  const isPro = userTier === 'creator_pro' || userTier === 'thriver';
  
  if (!isPro) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled
            className="relative opacity-50"
          >
            <RotateCcw className="h-5 w-5" />
            <Crown className="h-3 w-3 absolute -top-1 -right-1 text-yellow-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Upgrade to Pro or Thriver to undo swipes</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onClick}
          disabled={disabled || undosRemaining <= 0}
          className="relative"
        >
          <RotateCcw className="h-5 w-5" />
          {undosRemaining > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
              {undosRemaining}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{undosRemaining > 0 ? `${undosRemaining} undo${undosRemaining > 1 ? 's' : ''} left today` : 'No undos left today'}</p>
      </TooltipContent>
    </Tooltip>
  );
};
