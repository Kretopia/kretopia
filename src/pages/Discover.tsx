import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Heart, Star, MapPin, DollarSign, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CardType = "creator" | "opportunity";

interface Card {
  id: number;
  type: CardType;
  name: string;
  title: string;
  location: string;
  image: string;
  tags: string[];
  compensation?: string;
  description: string;
}

const mockCards: Card[] = [
  {
    id: 1,
    type: "opportunity",
    name: "Brand Identity Project",
    title: "Looking for Creative Designer",
    location: "Remote",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop",
    tags: ["Design", "Branding", "Paid"],
    compensation: "$500-800",
    description: "Need a talented designer for complete brand identity package including logo, colors, and guidelines.",
  },
  {
    id: 2,
    type: "creator",
    name: "Sarah Martinez",
    title: "Music Producer & Composer",
    location: "Los Angeles, CA",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
    tags: ["Music", "Production", "Collaboration"],
    description: "Passionate about creating unique soundscapes. Looking for vocalists and visual artists to collaborate with.",
  },
  {
    id: 3,
    type: "opportunity",
    name: "Short Film Project",
    title: "Cinematographer Needed",
    location: "New York, NY",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=500&fit=crop",
    tags: ["Film", "Barter", "Creative"],
    compensation: "Barter",
    description: "Working on an indie short film. Looking for a skilled cinematographer. Can offer editing services in exchange.",
  },
  {
    id: 4,
    type: "creator",
    name: "Alex Chen",
    title: "Motion Designer & Animator",
    location: "San Francisco, CA",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    tags: ["Animation", "Motion Design", "3D"],
    description: "Specializing in 3D motion graphics and character animation. Open to music videos and commercial work.",
  },
];

const Discover = () => {
  const [cards, setCards] = useState<Card[]>(mockCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  const handleSwipe = (direction: "left" | "right") => {
    const action = direction === "right" ? "liked" : "passed";
    toast({
      title: direction === "right" ? "Match! 💫" : "Keep swiping",
      description: direction === "right" 
        ? `You ${action} ${cards[currentIndex].name}` 
        : "Maybe the next one is perfect for you",
    });
    
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reset to beginning or show "no more cards" message
      setCurrentIndex(0);
    }
  };

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h2 className="mb-2 text-2xl font-bold">You've seen everything!</h2>
          <p className="text-muted-foreground">Check back later for new opportunities</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Card Counter */}
        <div className="mb-4 text-center">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>

        {/* Swipe Card */}
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          {/* Image */}
          <div className="relative h-96 overflow-hidden">
            <img
              src={currentCard.image}
              alt={currentCard.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Type Badge */}
            <div className="absolute right-4 top-4">
              <div className={`rounded-full px-4 py-2 text-sm font-medium ${
                currentCard.type === "creator" 
                  ? "bg-primary/90 text-primary-foreground" 
                  : "bg-secondary/90 text-secondary-foreground"
              }`}>
                {currentCard.type === "creator" ? "Creator" : "Opportunity"}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h2 className="mb-1 text-2xl font-bold">{currentCard.name}</h2>
            <p className="mb-3 text-lg text-muted-foreground">{currentCard.title}</p>

            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {currentCard.location}
              </div>
              {currentCard.compensation && (
                <div className="flex items-center gap-2 text-accent">
                  <DollarSign className="h-4 w-4" />
                  {currentCard.compensation}
                </div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {currentCard.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">{currentCard.description}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-16 w-16 rounded-full border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handleSwipe("left")}
          >
            <X className="h-8 w-8" />
          </Button>
          
          <Button
            variant="gradient"
            size="icon"
            className="h-20 w-20 rounded-full"
            onClick={() => handleSwipe("right")}
          >
            <Heart className="h-8 w-8" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-16 w-16 rounded-full border-2 hover:border-accent hover:bg-accent/10 hover:text-accent"
          >
            <Star className="h-8 w-8" />
          </Button>
        </div>

        {/* Swipe Hint */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Swipe right to connect • Swipe left to pass</p>
        </div>
      </div>
    </div>
  );
};

export default Discover;
