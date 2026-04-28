import { useEffect, useRef, useState } from "react";
import { Plus, Mic, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeskActionFabProps {
  onVoice: () => void;
  onCopilot: () => void;
}

/**
 * Single Desk action FAB that expands into labeled options.
 * Designed for non-tech-savvy users:
 *  - One obvious "+" button
 *  - Tap reveals labeled actions ("Voice note", "Project Copilot")
 *  - Tap outside or close (X) to dismiss
 *  - Large 56px tap targets
 */
export const DeskActionFab = ({ onVoice, onCopilot }: DeskActionFabProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handle = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <>
      {/* Backdrop dim when open — helps older users see the focus shift */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={containerRef}
        className="fixed right-4 z-40 flex flex-col items-end gap-3"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
      >
        {/* Expanded actions */}
        <div
          className={cn(
            "flex flex-col items-end gap-3 transition-all duration-200",
            open
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-2 pointer-events-none"
          )}
          aria-hidden={!open}
        >
          <ActionPill
            label="Project Copilot"
            icon={<Sparkles className="h-5 w-5" />}
            onClick={handle(onCopilot)}
          />
          <ActionPill
            label="Voice note"
            icon={<Mic className="h-5 w-5" />}
            onClick={handle(onVoice)}
          />
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl",
            "flex items-center justify-center active:scale-95 transition-all",
            open && "rotate-45"
          )}
          aria-label={open ? "Close actions" : "Open project actions"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
};

const ActionPill = ({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 h-12 pl-4 pr-2 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform"
  >
    <span className="text-sm font-semibold text-foreground">{label}</span>
    <span className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
      {icon}
    </span>
  </button>
);
