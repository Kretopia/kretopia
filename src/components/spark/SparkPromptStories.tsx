import { useState } from "react";
import { Sparkles, Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SparkResponseForm } from "./SparkResponseForm";

interface SparkPrompt {
  id: string;
  title: string;
  description: string;
  prompt_type: string;
  category: string;
  tags: string[];
  response_count: number;
}

interface SparkPromptStoriesProps {
  prompts: SparkPrompt[];
  userId: string;
  onResponseSubmitted: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  music: "🎵",
  visual: "🎨",
  fashion: "👗",
  film: "🎬",
  photography: "📸",
  design: "✏️",
  writing: "✍️",
  general: "✨",
};

export const SparkPromptStories = ({ prompts, userId, onResponseSubmitted }: SparkPromptStoriesProps) => {
  const [selectedPrompt, setSelectedPrompt] = useState<SparkPrompt | null>(null);

  if (prompts.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {prompts.map((prompt) => {
          const isWeekly = prompt.prompt_type === "weekly_challenge";
          const emoji = CATEGORY_EMOJIS[prompt.category] || "✨";

          return (
            <button
              key={prompt.id}
              onClick={() => setSelectedPrompt(prompt)}
              className={cn(
                "flex-shrink-0 w-20 flex flex-col items-center gap-1.5 group"
              )}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-2xl",
                  "ring-2 ring-offset-2 ring-offset-background transition-all",
                  "group-hover:scale-105",
                  isWeekly
                    ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-amber-500"
                    : "bg-gradient-to-br from-primary/20 to-accent/20 ring-primary/50"
                )}
              >
                {isWeekly ? <Trophy className="h-6 w-6 text-amber-500" /> : emoji}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight line-clamp-2 w-full">
                {isWeekly ? "Weekly" : prompt.category}
              </span>
            </button>
          );
        })}

        {/* "More" indicator */}
        <div className="flex-shrink-0 w-16 flex flex-col items-center gap-1.5 justify-center opacity-50">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted/50">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Prompt detail dialog */}
      <Dialog open={!!selectedPrompt} onOpenChange={(open) => !open && setSelectedPrompt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPrompt?.prompt_type === "weekly_challenge" ? (
                <Trophy className="h-5 w-5 text-amber-500" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
              {selectedPrompt?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{selectedPrompt?.description}</p>
          {selectedPrompt && (
            <SparkResponseForm
              promptId={selectedPrompt.id}
              userId={userId}
              onSubmitted={() => {
                setSelectedPrompt(null);
                onResponseSubmitted();
              }}
              onCancel={() => setSelectedPrompt(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
