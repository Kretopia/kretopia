import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditPromptDialog = ({ open, onOpenChange }: CreditPromptDialogProps) => {
  const navigate = useNavigate();

  const handleUpgrade = (tier: string) => {
    onOpenChange(false);
    navigate('/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Out of Swipes!
          </DialogTitle>
          <DialogDescription>
            You've reached your daily limit of 10 swipes. Upgrade to get unlimited swipes and more features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Thrive Pro */}
          <Card 
            className="p-4 border-primary bg-gradient-to-br from-primary/5 to-secondary/5 hover:border-primary hover:shadow-md transition-all cursor-pointer" 
            onClick={() => handleUpgrade('pro')}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gradient-to-br from-primary to-secondary p-2">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  Thrive Pro
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Unlimited swipes + AI recommendations + verification badge
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mb-2">
                  <li>✓ Unlimited daily swipes</li>
                  <li>✓ AI match recommendations</li>
                  <li>✓ Undo swipe feature</li>
                  <li>✓ Profile verification badge</li>
                </ul>
                <div className="text-lg font-bold text-primary">
                  $9/month
                </div>
              </div>
            </div>
          </Card>

          {/* Thrive Studio */}
          <Card 
            className="p-4 hover:border-primary transition-colors cursor-pointer" 
            onClick={() => handleUpgrade('studio')}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gradient-to-br from-primary to-accent p-2">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Thrive Studio</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Everything in Pro + featured profile + priority matching
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mb-2">
                  <li>✓ All Pro features</li>
                  <li>✓ Featured profile (2x visibility)</li>
                  <li>✓ Priority matching</li>
                  <li>✓ 15+ partner discounts</li>
                </ul>
                <div className="text-lg font-bold text-primary">
                  $29/month
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
