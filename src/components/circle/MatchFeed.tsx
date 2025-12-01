import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeCard } from "@/components/ui/swipe-card";
import { MapPin, Star, X, Heart, Sparkles, User } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";

interface CreatorCard {
  id: string;
  user_id: string;
  name: string;
  title: string;
  location: string;
  image: string;
  description: string;
  badge?: string;
  level?: number;
  matchScore?: number;
  matchReasons?: string[];
}

interface MatchFeedProps {
  cards: CreatorCard[];
  currentIndex: number;
  loading: boolean;
  dragOffset: { x: number; y: number };
  swipeDirection: "left" | "right" | null;
  isDragging: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onDragEnd: () => void;
  cardRef: React.RefObject<HTMLDivElement>;
}

const getBadgeColor = (badge: string) => {
  switch (badge) {
    case 'og': return 'bg-purple-500';
    case 'beta': return 'bg-blue-500';
    case 'vip': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

export const MatchFeed = ({
  cards,
  currentIndex,
  loading,
  dragOffset,
  swipeDirection,
  isDragging,
  onSwipeLeft,
  onSwipeRight,
  onDragStart,
  onDragMove,
  onDragEnd,
  cardRef
}: MatchFeedProps) => {
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  
  if (loading) {
    return (
      <div className="relative h-[500px] w-full flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Finding creators...</p>
        </div>
      </div>
    );
  }

  const currentCard = currentIndex < cards.length ? cards[currentIndex] : null;
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null;

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <div className="mb-6 p-6 rounded-full bg-primary/10 inline-flex">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-3">All Caught Up!</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          You've seen all available creators. Check back later for more matches!
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ height: '70vh', minHeight: '600px', maxHeight: '700px' }}>
      {/* Tinder-Style Card Stack */}
      
      {/* Next Card Preview (Subtle) */}
      {nextCard && (
        <div className="absolute inset-0 -z-10 scale-[0.92] opacity-30 pointer-events-none">
          <div className="relative h-full overflow-hidden rounded-3xl shadow-2xl">
            {nextCard.image ? (
              <img
                src={nextCard.image}
                alt={nextCard.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 text-8xl">
                👤
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Card */}
      <SwipeCard
        ref={cardRef}
        dragOffset={dragOffset}
        swipeDirection={swipeDirection}
        isDragging={isDragging}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
        className="absolute inset-0 rounded-3xl z-10"
      >
        <div className="relative h-full overflow-hidden rounded-3xl shadow-2xl">
          {/* Full Image Background */}
          <div className="absolute inset-0">
            {currentCard.image ? (
              <img
                src={currentCard.image}
                alt={currentCard.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-8xl">
                👤
              </div>
            )}
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          </div>
          
          {/* Top Badges */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
            <div className="flex flex-col gap-2">
              {currentCard.badge && (
                <Badge 
                  className={`${getBadgeColor(currentCard.badge)} text-white font-bold shadow-2xl text-sm px-3 py-1`}
                >
                  {currentCard.badge.toUpperCase()}
                </Badge>
              )}
              {currentCard.level && currentCard.level > 1 && (
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 gap-1">
                  <Star className="h-3 w-3" />
                  Lv {currentCard.level}
                </Badge>
              )}
            </div>
            {currentCard.matchScore && (
              <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 font-bold px-4 py-2 text-base shadow-2xl">
                ✨ {currentCard.matchScore}% Match
              </Badge>
            )}
          </div>

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 text-white z-10">
            <div className="space-y-3">
              <h3 className="text-3xl font-bold drop-shadow-lg">{currentCard.name}</h3>
              <p className="text-lg font-medium text-white/90 drop-shadow-md">{currentCard.title}</p>
              
              {currentCard.location && (
                <div className="flex items-center gap-1 text-white/80">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">{currentCard.location}</span>
                </div>
              )}
              
              {currentCard.description && (
                <p className="text-sm text-white/80 line-clamp-2 mt-2 drop-shadow-md">
                  {currentCard.description}
                </p>
              )}

              {/* AI Match Explanation */}
              {currentCard.matchReasons && currentCard.matchReasons.length > 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mt-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    🎯 Why You're a Perfect Match:
                  </h4>
                  <ul className="space-y-2">
                    {currentCard.matchReasons.map((reason, idx) => (
                      <li key={idx} className="text-white/90 text-sm flex items-start gap-2">
                        <span className="text-pink-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* View Profile Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewUserId(currentCard.user_id);
                }}
                className="mt-3 bg-white/20 hover:bg-white/30 backdrop-blur-md border-white/30 text-white"
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </SwipeCard>

      {/* Action Buttons - Tinder Style */}
      <div className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 flex items-center gap-8 z-20">
        <Button
          size="lg"
          variant="outline"
          onClick={onSwipeLeft}
          className="h-20 w-20 rounded-full border-4 border-red-500 bg-white hover:bg-red-500 hover:scale-110 transition-all shadow-2xl hover:shadow-red-500/50 group"
          aria-label="Pass"
        >
          <X className="h-10 w-10 text-red-500 group-hover:text-white transition-colors" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onSwipeRight}
          className="h-20 w-20 rounded-full border-4 border-green-500 bg-white hover:bg-green-500 hover:scale-110 transition-all shadow-2xl hover:shadow-green-500/50 group"
          aria-label="Like"
        >
          <Heart className="h-10 w-10 text-green-500 group-hover:text-white fill-current transition-colors" />
        </Button>
      </div>

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        open={!!previewUserId}
        onOpenChange={(open) => !open && setPreviewUserId(null)}
        userId={previewUserId || ''}
        userName={currentCard.name}
      />
    </div>
  );
};
