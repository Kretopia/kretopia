import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Zap, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditPromptDialog = ({ open, onOpenChange }: CreditPromptDialogProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/subscription');
  };

  const proFeatures = [
    "Unlimited daily swipes",
    "AI match explanations",
    "Undo swipe feature (3/day)",
    "Profile verification badge",
    "Unlimited work credits & portfolio",
    "Advanced search filters",
    "Press, credits & awards sections",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Out of Swipes!
          </DialogTitle>
          <DialogDescription>
            You've used all 30 daily swipes. Upgrade to Pro for unlimited swipes and powerful features.
          </DialogDescription>
        </DialogHeader>

        <Card 
          className="p-5 border-2 border-primary bg-gradient-to-br from-primary/5 to-secondary/5 hover:shadow-lg transition-all cursor-pointer" 
          onClick={handleUpgrade}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                ThriveIN Pro
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Recommended</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Everything you need to find your perfect collaborators
              </p>
              <ul className="text-sm space-y-1.5 mb-4">
                {proFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">$12</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90">
            Upgrade Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
