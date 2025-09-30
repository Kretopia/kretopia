import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ApplyToOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  opportunityTitle: string;
}

export const ApplyToOpportunityDialog = ({ 
  open, 
  onOpenChange, 
  opportunityId,
  opportunityTitle 
}: ApplyToOpportunityDialogProps) => {
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!coverLetter.trim()) {
      toast({
        title: "Cover letter required",
        description: "Please write a brief cover letter",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to apply",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const portfolioLinks = portfolioLink ? [portfolioLink] : [];

    const { error } = await supabase
      .from('applications')
      .insert({
        opportunity_id: opportunityId,
        applicant_id: user.id,
        cover_letter: coverLetter,
        portfolio_links: portfolioLinks,
        status: 'pending',
      });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: "Already applied",
          description: "You've already applied to this opportunity",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit application. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "Application submitted!",
      description: "The opportunity creator will review your application",
    });

    onOpenChange(false);
    setCoverLetter("");
    setPortfolioLink("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply to {opportunityTitle}</DialogTitle>
          <DialogDescription>
            Tell them why you're the perfect fit for this opportunity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cover-letter">Cover Letter *</Label>
            <Textarea
              id="cover-letter"
              placeholder="Why are you interested in this opportunity? What makes you a great fit?"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio Link (Optional)</Label>
            <Input
              id="portfolio"
              type="url"
              placeholder="https://your-portfolio.com"
              value={portfolioLink}
              onChange={(e) => setPortfolioLink(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
