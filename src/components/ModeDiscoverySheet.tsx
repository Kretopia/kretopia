import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Briefcase, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavMode } from "@/hooks/useNavMode";

const STORAGE_KEY = "thrivein-mode-onboarded";

export function ModeDiscoverySheet() {
  const [show, setShow] = useState(false);
  const { setMode } = useNavMode();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const timer = setTimeout(() => setShow(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const dismiss = (selectedMode?: "create" | "work") => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    if (selectedMode) setMode(selectedMode);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-card rounded-2xl border border-border shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Welcome to Your Creative OS</h2>
          <button onClick={() => dismiss()} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          ThriveIN has two modes. Swipe the bottom bar or tap to switch anytime.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => dismiss("create")}
            className="group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <span className="font-semibold text-sm">Explore</span>
            <span className="text-[11px] text-muted-foreground text-center leading-tight">
              Discover, connect, get inspired
            </span>
          </button>

          <button
            onClick={() => dismiss("work")}
            className="group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted hover:border-primary bg-muted/30 hover:bg-primary/5 transition-all"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="h-6 w-6 text-foreground" />
            </div>
            <span className="font-semibold text-sm">Work</span>
            <span className="text-[11px] text-muted-foreground text-center leading-tight">
              Projects, payments, pipeline
            </span>
          </button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-sm text-muted-foreground"
          onClick={() => dismiss()}
        >
          Skip for now
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
