import { INTENTS, type PrimaryIntent } from "@/lib/intents";

interface IntentPickerProps {
  value?: PrimaryIntent | null;
  onChange: (intent: PrimaryIntent) => void;
  /** Compact = smaller cards (for home weekly card). Default = onboarding-size. */
  compact?: boolean;
}

/**
 * 4 bold intent cards. Tapping commits the choice.
 * Visual: gradient border on selection, brand-aligned (purple primary, lime accent on selected).
 */
export const IntentPicker = ({ value, onChange, compact = false }: IntentPickerProps) => {
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${compact ? "" : "sm:gap-3"}`}>
      {INTENTS.map((intent) => {
        const selected = value === intent.id;
        return (
          <button
            key={intent.id}
            type="button"
            onClick={() => onChange(intent.id)}
            aria-pressed={selected}
            className={`
              group relative text-left rounded-2xl border-2 transition-all
              ${compact ? "p-3" : "p-4"}
              ${
                selected
                  ? "border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-energy/10 shadow-md shadow-primary/20"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              }
            `}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`
                  flex items-center justify-center rounded-xl shrink-0 transition-colors
                  ${compact ? "h-8 w-8 text-base" : "h-10 w-10 text-lg"}
                  ${selected ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"}
                `}
              >
                <span aria-hidden>{intent.emoji}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-bold leading-tight ${compact ? "text-[13px]" : "text-sm"}`}>
                  {intent.label}
                </p>
                {!compact && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {intent.blurb}
                  </p>
                )}
              </div>
            </div>
            {selected && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-energy" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
};
