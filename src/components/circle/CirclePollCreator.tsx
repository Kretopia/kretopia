import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Plus, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface CirclePollCreatorProps {
  onSubmit: (question: string, options: string[]) => void;
  onCancel: () => void;
  className?: string;
}

export const CirclePollCreator = ({ onSubmit, onCancel, className }: CirclePollCreatorProps) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    setOptions(options.map((o, i) => i === idx ? val : o));
  };

  const canSubmit = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <div className={cn("p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <BarChart3 className="h-3.5 w-3.5" />
          Create Poll
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Input
        placeholder="Ask a question..."
        value={question}
        onChange={e => setQuestion(e.target.value)}
        className="text-sm h-8 bg-background"
      />

      <div className="space-y-1.5">
        {options.map((opt, idx) => (
          <div key={idx} className="flex gap-1.5">
            <Input
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={e => updateOption(idx, e.target.value)}
              className="text-xs h-7 bg-background"
            />
            {options.length > 2 && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeOption(idx)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addOption} disabled={options.length >= 6}>
          <Plus className="h-3 w-3" /> Add Option
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => canSubmit && onSubmit(question, options.filter(o => o.trim()))} disabled={!canSubmit}>
          <Send className="h-3 w-3" /> Post Poll
        </Button>
      </div>
    </div>
  );
};

// Poll display component for messages
export const CirclePollDisplay = ({ 
  pollData, 
  userId, 
  onVote 
}: { 
  pollData: { question: string; options: { text: string; votes: string[] }[] }; 
  userId?: string;
  onVote: (optionIndex: number) => void;
}) => {
  const totalVotes = pollData.options.reduce((sum, o) => sum + o.votes.length, 0);
  const hasVoted = pollData.options.some(o => o.votes.includes(userId || ""));

  return (
    <div className="space-y-2 mt-1">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        {pollData.question}
      </p>
      <div className="space-y-1.5">
        {pollData.options.map((opt, idx) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const myVote = opt.votes.includes(userId || "");
          return (
            <button
              key={idx}
              onClick={() => !hasVoted && onVote(idx)}
              disabled={hasVoted}
              className={cn(
                "w-full relative rounded-lg border p-2 text-left text-xs transition-all overflow-hidden",
                hasVoted ? "cursor-default" : "hover:border-primary/50 cursor-pointer",
                myVote && "border-primary bg-primary/5"
              )}
            >
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={cn("font-medium", myVote && "text-primary")}>{opt.text}</span>
                {hasVoted && <span className="text-[10px] text-muted-foreground">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </div>
  );
};
