import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Sparkles, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-dom-confetti';
import { useState, useEffect } from 'react';

interface MatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchedProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
  currentUserAvatar?: string | null;
}

const confettiConfig = {
  angle: 90,
  spread: 120,
  startVelocity: 45,
  elementCount: 100,
  dragFriction: 0.12,
  duration: 3000,
  stagger: 3,
  width: '10px',
  height: '10px',
  colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a']
};

const ICEBREAKER_PROMPTS = [
  "Hey! I love your work. Want to collaborate on something?",
  "Your portfolio is amazing! I'd love to connect.",
  "I think we could create something great together!",
  "Let's chat about potential collaboration opportunities!"
];

export function MatchModal({
  open,
  onOpenChange,
  matchedProfile,
  currentUserAvatar
}: MatchModalProps) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setShowConfetti(true), 100);
    } else {
      setShowConfetti(false);
    }
  }, [open]);

  if (!matchedProfile) return null;

  const matchedInitials = matchedProfile.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleSendMessage = () => {
    onOpenChange(false);
    navigate(`/messages?user=${matchedProfile.user_id}`);
  };

  const handleStartProject = () => {
    onOpenChange(false);
    navigate(`/desk/new?collaborator=${matchedProfile.user_id}`);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background border-none">
        {/* Confetti Container */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>

        <div className="p-8 text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">It's a Match!</span>
            </div>
            <h2 className="text-2xl font-bold">
              You matched with {matchedProfile.full_name}!
            </h2>
            <p className="text-muted-foreground mt-2">
              Start a conversation to begin collaborating
            </p>
          </div>

          {/* Avatars */}
          <div className="relative flex justify-center items-center mb-8">
            {/* Current User Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl z-10 -mr-4">
              {currentUserAvatar ? (
                <AvatarImage src={currentUserAvatar} alt="You" />
              ) : (
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  You
                </AvatarFallback>
              )}
            </Avatar>
            
            {/* Heart Icon */}
            <div className="absolute z-20 bg-red-500 rounded-full p-2 shadow-lg">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            
            {/* Matched User Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl z-10 -ml-4">
              <AvatarImage src={matchedProfile.avatar_url || ''} alt={matchedProfile.full_name} />
              <AvatarFallback className="text-2xl bg-secondary">
                {matchedInitials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Matched User Info */}
          <div className="mb-6">
            <p className="text-lg font-medium">{matchedProfile.full_name}</p>
            <p className="text-sm text-muted-foreground">{matchedProfile.role}</p>
          </div>

          {/* Icebreaker Prompt */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-2">Suggested icebreaker:</p>
            <p className="text-sm italic">
              "{ICEBREAKER_PROMPTS[Math.floor(Math.random() * ICEBREAKER_PROMPTS.length)]}"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleSendMessage}
            >
              <MessageCircle className="h-5 w-5" />
              Send a Message
            </Button>
            
            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              onClick={handleStartProject}
            >
              <FolderPlus className="h-5 w-5" />
              Start a Project on ThriveDesk
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleClose}
            >
              Continue Swiping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
