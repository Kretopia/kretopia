import type { ReactNode } from "react";
import { BookOpen, Headphones, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SpotlightTab = "magazine" | "podcast";

const TABS: {
  value: SpotlightTab;
  label: string;
  icon: typeof BookOpen;
  hint: string;
}[] = [
  {
    value: "magazine",
    label: "Magazine",
    icon: BookOpen,
    hint: "Long reads, interviews and features — tap any story to open it, share it or save it for later.",
  },
  {
    value: "podcast",
    label: "Podcast",
    icon: Headphones,
    hint: "Discover A Thriver — press play on the featured episode, then pick any other from the list below it.",
  },
];

/**
 * The Spotlight desk — one editorial board wrapping Magazine and Podcast in
 * the same dark surface, segmented tabs and guidance line used across the
 * rest of the project (see CreditsBoard), instead of two loose tab panels.
 */
export function SpotlightBoard({
  value,
  onValueChange,
  magazine,
  podcast,
  className,
}: {
  value: SpotlightTab;
  onValueChange: (tab: SpotlightTab) => void;
  magazine: ReactNode;
  podcast: ReactNode;
  className?: string;
}) {
  const active = TABS.find((t) => t.value === value) ?? TABS[0];

  return (
    <div className={cn("w-full rounded-2xl border border-border bg-card overflow-hidden", className)}>
      {/* Board header */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">The Spotlight desk</h3>
          <span className="text-[11px] text-muted-foreground">Read it or hear it</span>
        </div>

        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Everything published by Kretopia lives here: written stories on one side, recorded
          conversations on the other. Pick a side — the content loads straight away, no sign-up needed.
        </p>

        <Tabs value={value} onValueChange={(v) => onValueChange(v as SpotlightTab)} className="mt-3">
          <TabsList className="h-auto gap-1.5 rounded-full bg-transparent p-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground data-[state=active]:border-[hsl(var(--energy)/0.4)] data-[state=active]:bg-[hsl(var(--energy)/0.1)] data-[state=active]:text-foreground"
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-[2px]" />
          {active.hint}
        </p>
      </div>

      {/* Board body */}
      <div className="p-3 sm:p-5">
        {value === "magazine" ? magazine : podcast}
      </div>
    </div>
  );
}

export default SpotlightBoard;
