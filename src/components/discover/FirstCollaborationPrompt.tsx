import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FirstCollaborationPromptProps {
  onPostOpportunity: () => void;
}

export function FirstCollaborationPrompt({ onPostOpportunity }: FirstCollaborationPromptProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkFirstVisit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has seen this prompt before
      const hasSeenPrompt = localStorage.getItem(`collab_prompt_seen_${user.id}`);
      
      if (!hasSeenPrompt) {
        // Check if user just completed onboarding (has low XP, hasn't posted anything)
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp, onboarding_completed')
          .eq('user_id', user.id)
          .single();

        const { data: opportunities } = await supabase
          .from('opportunities')
          .select('id')
          .eq('created_by', user.id)
          .limit(1);

        // Show prompt if they completed onboarding but haven't posted yet
        if (profile?.onboarding_completed && (!opportunities || opportunities.length === 0)) {
          setOpen(true);
        }
      }
    };

    checkFirstVisit();
  }, []);

  const handleClose = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`collab_prompt_seen_${user.id}`, 'true');
    }
    setOpen(false);
  };

  const handlePostCollaboration = () => {
    handleClose();
    onPostOpportunity();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Welcome to ThriveIN! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You're now part of the creative economy. Ready to make your first connection?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-accent/30 p-4">
            <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm mb-1">Connect with Creators</p>
              <p className="text-xs text-muted-foreground">
                Swipe through profiles to find your next collaborator
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <Briefcase className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm mb-1">Post Your First Collaboration</p>
              <p className="text-xs text-muted-foreground">
                Share what you're working on and attract the right talent
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handlePostCollaboration} size="lg" className="w-full">
            <Briefcase className="mr-2 h-4 w-4" />
            Post a Collaboration
          </Button>
          <Button onClick={handleClose} variant="ghost" size="sm">
            I'll explore first
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
