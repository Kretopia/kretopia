import { Zap, Timer, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CADENCE_OPTIONS = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "daily", label: "Daily", icon: Zap },
  { value: "48hr", label: "48hr", icon: Timer },
  { value: "weekly", label: "Weekly", icon: CalendarDays },
] as const;

interface CadenceTabsProps {
  active: string;
  onChange: (value: string) => void;
}

export const CadenceTabs = ({ active, onChange }: CadenceTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {CADENCE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
