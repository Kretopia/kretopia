import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeCard } from "@/components/ui/swipe-card";
import { MapPin, Star, X, Heart, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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
      <EmptyState
        icon={Sparkles}
        title="All caught up!"
        description="You've seen all available creators. Check back later for more!"
      />
    );
  }

  return (
    <div className="relative h-[500px] w-full">
      {/* Next Card (Background) */}
      {nextCard && (
        <div className="absolute inset-0">
          <div className="relative h-full w-full opacity-50 scale-95">
            <img
              src={nextCard.image}
              alt={nextCard.name}
              className="absolute inset-0 h-full w-full object-cover rounded-2xl"
            />
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
        className="absolute inset-0 h-full w-full"
      >
        <div className="relative h-full">
          <img
            src={currentCard.image}
            alt={currentCard.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold">{currentCard.name}</h2>
                  {currentCard.badge && (
                    <Badge className={`${getBadgeColor(currentCard.badge)} text-white`}>
                      {currentCard.badge.toUpperCase()}
                    </Badge>
                  )}
                  {currentCard.level && currentCard.level > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      Lv {currentCard.level}
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-white/90 mb-2">{currentCard.title}</p>
                {currentCard.location && (
                  <div className="flex items-center gap-1 text-sm text-white/70 mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{currentCard.location}</span>
                  </div>
                )}
                <p className="text-sm text-white/80 line-clamp-2">
                  {currentCard.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SwipeCard>

      {/* Action Buttons */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={onSwipeLeft}
          className="h-14 w-14 rounded-full border-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
        >
          <X className="h-6 w-6" />
        </Button>
        <Button
          size="lg"
          onClick={onSwipeRight}
          className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white"
        >
          <Heart className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};
