import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Heart, Star, MapPin, DollarSign, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type CardType = "creator" | "opportunity";

interface Card {
  id: string;
  type: CardType;
  name: string;
  title: string;
  location: string;
  image: string;
  tags: string[];
  compensation?: string;
  description: string;
}

const Discover = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profiles (creators)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .limit(10);

      // Fetch opportunities
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'active')
        .limit(10);

      const creatorCards: Card[] = (profiles || []).map(profile => ({
        id: profile.id,
        type: 'creator' as CardType,
        name: profile.full_name,
        title: profile.role,
        location: profile.location || 'Remote',
        image: profile.avatar_url || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop`,
        tags: ['Creator'],
        description: profile.bio || 'Creative professional looking to collaborate',
      }));

      const opportunityCards: Card[] = (opportunities || []).map(opp => ({
        id: opp.id,
        type: 'opportunity' as CardType,
        name: opp.title,
        title: opp.type.charAt(0).toUpperCase() + opp.type.slice(1),
        location: opp.location || 'Remote',
        image: opp.image_url || `https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop`,
        tags: opp.tags || [],
        compensation: opp.compensation,
        description: opp.description,
      }));

      // Mix creators and opportunities
      const allCards = [...creatorCards, ...opportunityCards].sort(() => Math.random() - 0.5);
      setCards(allCards);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSwipe = async (direction: "left" | "right") => {
    const currentCard = cards[currentIndex];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save swipe to database
    await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: currentCard.id,
      target_type: currentCard.type,
      direction,
    });

    const action = direction === "right" ? "liked" : "passed";
    toast({
      title: direction === "right" ? "Match! 💫" : "Keep swiping",
      description: direction === "right" 
        ? `You ${action} ${currentCard.name}` 
        : "Maybe the next one is perfect for you",
    });
    
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h2 className="mb-2 text-2xl font-bold">No cards available yet</h2>
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
