import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Users } from "lucide-react";

interface ChallengeCardProps {
  challenge: {
    id: string;
    title: string;
    description: string;
    category: string;
    type: string;
    deadline: string;
    prize_description: string | null;
    budget: string | null;
    thumbnail_url: string | null;
    brand_name: string | null;
    brand_logo_url: string | null;
  };
  entryCount: number;
  daysLeft: number;
  onClick: () => void;
}

export const ChallengeCard = ({ challenge, entryCount, daysLeft, onClick }: ChallengeCardProps) => {
  return (
    <Card className="hover-lift overflow-hidden group cursor-pointer" onClick={onClick}>
      <div className="relative h-48 overflow-hidden">
        <img
          src={challenge.thumbnail_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400"}
          alt={challenge.title}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
        <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur">
          {challenge.category}
        </Badge>
        <div className={`absolute bottom-3 right-3 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${
          daysLeft <= 3 ? 'bg-destructive/90 text-destructive-foreground' : 'bg-background/90'
        }`}>
          <Calendar className="h-3 w-3" />
          {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
        </div>
      </div>
      <CardHeader>
        {challenge.brand_name && (
          <div className="flex items-center gap-2 mb-2">
            {challenge.brand_logo_url && (
              <img src={challenge.brand_logo_url} alt={challenge.brand_name} className="h-6 w-6 rounded" />
            )}
            <span className="text-sm font-semibold">{challenge.brand_name}</span>
          </div>
        )}
        <CardTitle className="text-xl">{challenge.title}</CardTitle>
        <CardDescription className="line-clamp-2">{challenge.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {entryCount}
            </div>
          </div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Trophy className="h-4 w-4" />
            {challenge.prize_description || challenge.budget}
          </div>
        </div>
        <Button className="w-full" variant="gradient">
          View Challenge
        </Button>
      </CardContent>
    </Card>
  );
};
