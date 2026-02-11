import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, MessageCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkPromptCardProps {
  prompt: {
    id: string;
    title: string;
    description: string;
    prompt_type: string;
    category: string;
    tags: string[];
    response_count: number;
  };
  isSelected: boolean;
  onSelect: () => void;
}

export const SparkPromptCard = ({ prompt, isSelected, onSelect }: SparkPromptCardProps) => {
  const isWeekly = prompt.prompt_type === 'weekly_challenge';

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 overflow-hidden",
        isWeekly 
          ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30" 
          : "bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20",
        isSelected && "ring-2 ring-primary/50 shadow-lg"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {isWeekly ? (
              <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            )}
            <div>
              {isWeekly && (
                <Badge variant="secondary" className="mb-1 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  WEEKLY CHALLENGE
                </Badge>
              )}
              <h3 className="font-bold text-base leading-tight">{prompt.title}</h3>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="flex-shrink-0">
            Respond <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {prompt.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {prompt.tags?.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            {prompt.response_count} responses
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
