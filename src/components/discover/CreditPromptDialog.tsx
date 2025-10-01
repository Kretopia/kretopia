import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coins, Zap, Gift, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditPromptDialog = ({ open, onOpenChange }: CreditPromptDialogProps) => {
  const navigate = useNavigate();

  const handleEarnCredits = () => {
    onOpenChange(false);
    navigate('/earn-credits');
  };

  const handleBuyCredits = () => {
    onOpenChange(false);
    navigate('/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Out of Swipes!
          </DialogTitle>
          <DialogDescription>
            You've reached your daily swipe limit. Get more swipes to continue discovering amazing creators and opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Earn Free Credits */}
          <Card className="p-4 hover:border-primary transition-colors cursor-pointer" onClick={handleEarnCredits}>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent/10 p-2">
                <Gift className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Earn Free Swipes</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Complete simple tasks to earn credits and unlock more swipes
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>• Complete profile: +10 swipes</span>
                  <span>• Daily login: +5 swipes</span>
                  <span>• Connect with creators: +2 swipes each</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Buy Credits */}
          <Card className="p-4 hover:border-primary transition-colors cursor-pointer" onClick={handleBuyCredits}>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Buy Swipe Credits</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Purchase credits for instant swipes
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>• 50 swipes: $4.99</span>
                  <span>• 100 swipes: $8.99</span>
                  <span>• 250 swipes: $19.99</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Premium */}
          <Card className="p-4 border-primary bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary transition-colors cursor-pointer" onClick={handleBuyCredits}>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gradient-to-br from-primary to-secondary p-2">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  Go Premium
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Best Value</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Unlimited swipes + advanced filters + priority matching
                </p>
                <div className="text-lg font-bold text-primary">
                  $9.99/month
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Maybe Later
        </Button>
      </DialogContent>
    </Dialog>
  );
};
