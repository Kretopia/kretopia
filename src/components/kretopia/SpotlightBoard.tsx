import { useState, type ReactNode } from "react";
import { BookOpen, Headphones, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

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
    <Reveal className={cn("w-full", className)}>
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}
      >
        {/* Board header */}
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">The Spotlight desk</h2>
            <span className="text-[11px] text-white/40">Read it or hear it</span>
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
            Everything published by Kretopia lives here: written stories on one side, recorded
            conversations on the other. Pick a side — the content loads straight away, no sign-up needed.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.value === value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onValueChange(t.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors border",
                    isActive ? "text-white" : "text-white/55 hover:text-white/80",
                  )}
                  style={{
                    borderColor: isActive ? "rgba(255,45,161,0.4)" : "rgba(255,255,255,0.08)",
                    backgroundColor: isActive ? "rgba(255,45,161,0.10)" : "transparent",
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-white/45">
            <Info className="h-3 w-3 shrink-0 mt-[2px]" />
            {active.hint}
          </p>
        </div>

        {/* Board body */}
        <div className="p-3 sm:p-5">
          {value === "magazine" ? magazine : podcast}
        </div>
      </div>
    </Reveal>
  );
}

export default SpotlightBoard;
