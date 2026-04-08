import { useState, useRef, useCallback, useEffect } from 'react';
import { SwipeCard } from './SwipeCard';
import { SwipeProfile } from '@/hooks/useSwipeProfiles';
import { Button } from '@/components/ui/button';
import { X, Heart, RotateCcw, Eye, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeStackProps {
  profiles: SwipeProfile[];
  onSwipe: (profile: SwipeProfile, direction: 'left' | 'right') => void;
  onViewProfile: (profile: SwipeProfile) => void;
  onMatchBadgeClick: (profile: SwipeProfile) => void;
  onMessage?: (profile: SwipeProfile) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  loading?: boolean;
}

export function SwipeStack({
  profiles,
  onSwipe,
  onViewProfile,
  onMatchBadgeClick,
  onMessage,
  onUndo,
  canUndo = false,
  loading = false
}: SwipeStackProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Use first profile in the array as current (array shrinks as profiles are removed)
  const currentProfile = profiles[0];
  const nextProfile = profiles[1];

  

  const SWIPE_THRESHOLD = 100;
  const DRAG_THRESHOLD = 50;

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (isAnimating) return;
    dragStartRef.current = { x: clientX, y: clientY };
    setIsDragging(true);
  }, [isAnimating]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || isAnimating) return;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    setDragOffset({ x: deltaX, y: deltaY * 0.3 });

    if (Math.abs(deltaX) > DRAG_THRESHOLD) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  }, [isDragging, isAnimating]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);

    if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD && currentProfile) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      animateSwipe(direction);
    } else {
      resetPosition();
    }
  }, [isDragging, isAnimating, dragOffset.x, currentProfile]);

  const resetPosition = useCallback(() => {
    setDragOffset({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, []);

  const animateSwipe = useCallback((direction: 'left' | 'right') => {
    if (!currentProfile) return;

    setIsAnimating(true);
    setSwipeDirection(direction);

    const targetX = direction === 'right' ? window.innerWidth * 1.5 : -window.innerWidth * 1.5;
    setDragOffset({ x: targetX, y: 0 });

    setTimeout(() => {
      onSwipe(currentProfile, direction);
      // Profile is removed from array by parent, no need to track index
      resetPosition();
      setIsAnimating(false);
    }, 300);
  }, [currentProfile, onSwipe, resetPosition]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Button actions
  const handlePass = () => {
    if (!isAnimating && currentProfile) {
      animateSwipe('left');
    }
  };

  const handleLike = () => {
    if (!isAnimating && currentProfile) {
      animateSwipe('right');
    }
  };

  const handleViewProfile = () => {
    if (currentProfile && !isDragging) {
      onViewProfile(currentProfile);
    }
  };

  const handleMessage = () => {
    if (currentProfile && onMessage) {
      onMessage(currentProfile);
    }
  };

  // Card transform styles
  const getCardStyle = (isActive: boolean): React.CSSProperties => {
    if (!isActive) {
      return {
        transform: 'scale(0.95) translateY(20px)',
        opacity: 0.5,
        zIndex: 0
      };
    }

    const rotation = (dragOffset.x / 20) * (isDragging ? 1 : 0);
    return {
      transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      zIndex: 10
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-center px-4">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
          <Heart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
        <p className="text-muted-foreground mb-4">
          You've seen all available creators for now. Check back later!
        </p>
        {canUndo && onUndo && (
          <Button variant="outline" onClick={onUndo} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Undo Last Swipe
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full px-4 sm:px-0">
      {/* Card Stack */}
      <div 
        className="relative w-full max-w-[340px] sm:max-w-sm h-[420px] sm:h-[480px] md:h-[520px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Next Card (Preview) */}
        {nextProfile && (
          <SwipeCard
            profile={nextProfile}
            style={getCardStyle(false)}
            className="pointer-events-none"
          />
        )}

        {/* Current Card */}
        <SwipeCard
          ref={cardRef}
          profile={currentProfile}
          onViewProfile={handleViewProfile}
          onMatchBadgeClick={() => onMatchBadgeClick(currentProfile)}
          style={getCardStyle(true)}
        />

        {/* Swipe Overlays */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl transition-opacity duration-200 pointer-events-none z-20",
            swipeDirection === 'left' ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="bg-red-500/90 rounded-full p-4 sm:p-6">
            <X className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl transition-opacity duration-200 pointer-events-none z-20",
            swipeDirection === 'right' ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="bg-green-500/90 rounded-full p-4 sm:p-6">
            <Heart className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
        {/* Pass Button */}
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-red-500/50 hover:bg-red-500/10 hover:border-red-500 active:scale-95 transition-transform"
          onClick={handlePass}
          disabled={isAnimating}
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
        </Button>

        {/* View Profile Button */}
        <Button
          variant="outline"
          size="lg"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 active:scale-95 transition-transform"
          onClick={handleViewProfile}
          disabled={isAnimating}
        >
          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Send Message Button */}
        {onMessage && (
          <Button
            variant="outline"
            size="lg"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-primary/50 hover:bg-primary/10 hover:border-primary active:scale-95 transition-transform"
            onClick={handleMessage}
            disabled={isAnimating}
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </Button>
        )}

        {/* Like Button */}
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-green-500/50 hover:bg-green-500/10 hover:border-green-500 active:scale-95 transition-transform"
          onClick={handleLike}
          disabled={isAnimating}
        >
          <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
        </Button>
      </div>

      {/* Undo Button */}
      {canUndo && onUndo && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 sm:mt-4 text-muted-foreground"
          onClick={onUndo}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Undo
        </Button>
      )}

      {/* Counter */}
      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
        {profiles.length} creators available
      </p>
    </div>
  );
}
