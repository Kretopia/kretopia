import { useState } from "react";
import { Building2, User, ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AccountSwitcherProps {
  currentAccountType: "individual" | "company";
  onSwitch?: () => void;
  variant?: "menu" | "settings";
}

export const AccountSwitcher = ({ currentAccountType, onSwitch, variant = "menu" }: AccountSwitcherProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);

  const isCompany = currentAccountType === "company";
  const targetType = isCompany ? "individual" : "company";
  const targetLabel = isCompany ? "Personal Creator" : "Company / Brand";
  const TargetIcon = isCompany ? User : Building2;

  const handleSwitch = async () => {
    if (!user) return;
    setSwitching(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_type: targetType })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: `Switched to ${targetLabel}`,
        description: `Your profile is now displaying as a ${targetLabel.toLowerCase()} account.`,
      });

      onSwitch?.();
      // Reload to refresh all profile-dependent UI
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Switch failed",
        description: error.message || "Could not switch account type",
        variant: "destructive",
      });
    } finally {
      setSwitching(false);
      setShowConfirm(false);
    }
  };

  if (variant === "settings") {
    return (
      <>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            {isCompany ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
            <div>
              <p className="font-medium text-sm">
                Currently: {isCompany ? "Company / Brand" : "Personal Creator"}
              </p>
              <p className="text-xs text-muted-foreground">
                Switch to {targetLabel} to change your profile layout
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={switching}
            className="gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Switch
          </Button>
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <TargetIcon className="h-5 w-5" />
                Switch to {targetLabel}?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Your profile will switch to a <strong>{targetLabel.toLowerCase()}</strong> layout. Here's what happens:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Your {isCompany ? "company" : "personal"} data is <strong>preserved</strong> — you can switch back anytime</li>
                  <li>Connections, subscription, and portfolio are <strong>shared</strong> across both views</li>
                  <li>Your profile layout and public appearance will change</li>
                  {!isCompany && (
                    <li>You'll need to fill in your company name and details if you haven't already</li>
                  )}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={switching}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSwitch} disabled={switching}>
                {switching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Switch to {targetLabel}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Menu variant (compact)
  return (
    <>
      <Button
        variant="ghost"
        className="justify-start gap-3 h-12 w-full"
        onClick={() => setShowConfirm(true)}
        disabled={switching}
      >
        <ArrowRightLeft className="h-5 w-5" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">Switch to {targetLabel}</span>
          <span className="text-[10px] text-muted-foreground">
            Currently: {isCompany ? "Company" : "Personal"}
          </span>
        </div>
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5" />
              Switch to {targetLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Your profile will display as a <strong>{targetLabel.toLowerCase()}</strong>. All your data is preserved — you can switch back anytime.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={switching}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwitch} disabled={switching}>
              {switching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Switch
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
