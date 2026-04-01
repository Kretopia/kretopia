import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Sparkles, FolderPlus, Trophy, Star, Zap, PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-dom-confetti';
import { useState, useEffect } from 'react';

interface FirstMatchCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchedProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
  currentUserAvatar?: string | null;
  isFirstMatch?: boolean;
  xpAwarded?: number;
}

const confettiConfig = {
  angle: 90,
  spread: 180,
  startVelocity: 55,
  elementCount: 150,
  dragFriction: 0.1,
  duration: 4000,
  stagger: 2,
  width: '12px',
  height: '12px',
  colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F472B6', '#34D399', '#60A5FA']
};

const CELEBRATION_PROMPTS = [
  "Your creative journey just got 10x more exciting! 🚀",
  "This is the start of something amazing! ✨",
  "Time to create magic together! 🎨",
  "Your network is growing - so is your potential! 💫"
];

export function FirstMatchCelebration({
  open,
  onOpenChange,
  matchedProfile,
  currentUserAvatar,
  isFirstMatch = false,
  xpAwarded = 50
}: FirstMatchCelebrationProps) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationText] = useState(
    CELEBRATION_PROMPTS[Math.floor(Math.random() * CELEBRATION_PROMPTS.length)]
  );

  useEffect(() => {
    if (open) {
      // Delayed confetti for more impact
      setTimeout(() => setShowConfetti(true), 300);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none bg-gradient-to-b from-primary/20 via-background to-background">
        {/* Multiple confetti sources for epic effect */}
        <div className="absolute top-0 left-1/4 z-50">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>
        <div className="absolute top-0 left-1/2 z-50">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>
        <div className="absolute top-0 left-3/4 z-50">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>

        <div className="p-8 text-center">
          {/* First Match Badge */}
          {isFirstMatch && (
            <div className="mb-4 animate-bounce">
              <Badge className="gap-2 px-4 py-2 text-base bg-gradient-to-r from-yellow-500 to-orange-500 border-none">
                <Trophy className="h-5 w-5" />
                First Match Achievement!
              </Badge>
            </div>
          )}

          {/* Main Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 text-primary mb-4">
              <PartyPopper className="h-6 w-6 animate-pulse" />
              <span className="font-bold text-lg">It's a Match!</span>
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              You matched with {matchedProfile.full_name}!
            </h2>
            <p className="text-muted-foreground text-lg">
              {celebrationText}
            </p>
          </div>

          {/* Points Reward */}
          {isFirstMatch && (
            <div className="flex items-center justify-center gap-3 mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-500" />
                <span className="font-bold text-xl text-yellow-600">+{xpAwarded} TP</span>
              </div>
              <Star className="h-5 w-5 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          )}

          {/* Avatars with enhanced animation */}
          <div className="relative flex justify-center items-center mb-8">
            {/* Glow effect */}
            <div className="absolute w-32 h-32 bg-primary/30 rounded-full blur-2xl animate-pulse" />
            
            {/* Current User Avatar */}
            <Avatar className="h-28 w-28 border-4 border-background shadow-2xl z-10 -mr-6 ring-4 ring-primary/20">
              {currentUserAvatar ? (
                <AvatarImage src={currentUserAvatar} alt="You" />
              ) : (
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  You
                </AvatarFallback>
              )}
            </Avatar>
            
            {/* Heart Icon - animated */}
            <div className="absolute z-20 bg-gradient-to-br from-red-500 to-primary rounded-full p-3 shadow-xl animate-pulse">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            
            {/* Matched User Avatar */}
            <Avatar className="h-28 w-28 border-4 border-background shadow-2xl z-10 -ml-6 ring-4 ring-secondary/20">
              <AvatarImage src={matchedProfile.avatar_url || ''} alt={matchedProfile.full_name} />
              <AvatarFallback className="text-2xl bg-secondary">
                {matchedInitials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Matched User Info */}
          <div className="mb-6">
            <p className="text-xl font-semibold">{matchedProfile.full_name}</p>
            <p className="text-muted-foreground">{matchedProfile.role}</p>
          </div>

          {/* What's Next Section */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-primary mb-2">What happens next?</p>
            <p className="text-sm text-muted-foreground">
              Send a message to start collaborating, or create a project workspace to begin working together right away!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full gap-2 text-lg h-12 shadow-lg bg-gradient-to-r from-primary to-primary/80"
              onClick={handleSendMessage}
            >
              <MessageCircle className="h-5 w-5" />
              Send a Message
            </Button>
            
            <Button
              variant="outline"
              className="w-full gap-2 h-11"
              onClick={handleStartProject}
            >
              <FolderPlus className="h-5 w-5" />
              Start a Project Together
            </Button>
            
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Continue Exploring
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
