import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DeskAIPanel } from "./DeskAIPanel";
import { cn } from "@/lib/utils";

interface DeskAILauncherProps {
  projectId: string;
  userId: string;
  isPro: boolean;
  hideOnMobile?: boolean;
}

export const DeskAILauncher = ({ projectId, userId, isPro, hideOnMobile = false }: DeskAILauncherProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className={cn(
          "fixed z-40 h-12 w-12 rounded-full shadow-lg",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
          "hover:scale-105 transition-transform",
          hideOnMobile && "hidden sm:inline-flex",
          // Position: above mobile bottom nav, bottom-right on desktop
          "bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-4",
          "lg:bottom-6 lg:right-6"
        )}
        aria-label="Open Thrive Ops AI"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          <DeskAIPanel
            projectId={projectId}
            userId={userId}
            isPro={isPro}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
