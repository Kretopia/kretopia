import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Clock, Users, Check, Loader2, Ticket } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Session {
  id: string;
  title: string;
  description?: string;
  category: string;
  venue_name?: string;
  venue_address?: string;
  start_time: string;
  max_participants: number;
  participant_count: number;
  distance_km?: number;
  creator_name: string;
  creator_avatar?: string;
  created_by: string;
  is_ticketed?: boolean;
  ticket_price?: number;
  ticket_currency?: string;
  event_type?: string;
}

interface SessionCardProps {
  session: Session;
  userParticipation?: 'going' | 'interested' | 'maybe' | null;
  onJoin?: () => void;
  onClick?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  music: '🎵 Music',
  film: '🎬 Film',
  photo: '📸 Photo',
  art: '🎨 Art',
  podcast: '🎙️ Podcast',
  workshop: '📚 Workshop',
  networking: '🤝 Networking',
  content: '📱 Content',
  festival: '🎪 Festival',
  showcase: '🌟 Showcase',
  general: '✨ Creative',
};

export const SessionCard = ({ session, userParticipation, onJoin, onClick }: SessionCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [participation, setParticipation] = useState(userParticipation);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to join events",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (participation) {
        // Already joined - leave
        await supabase
          .from('jam_participants')
          .delete()
          .eq('jam_id', session.id)
          .eq('user_id', user.id);
        
        setParticipation(null);
        toast({ title: "Left session" });
      } else {
        // Join as "going"
        await supabase
          .from('jam_participants')
          .insert({
            jam_id: session.id,
            user_id: user.id,
            status: 'going'
          });
        
        setParticipation('going');
        toast({ title: "Joined session! 🎉" });
      }
      onJoin?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update participation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isCreator = user?.id === session.created_by;
  const isFull = session.participant_count >= session.max_participants;
  const startDate = new Date(session.start_time);
  const isPast = startDate < new Date();

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={session.creator_avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {session.creator_name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                {session.title}
              </h4>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {CATEGORY_LABELS[session.category] || session.category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">by {session.creator_name}</p>
          </div>
        </div>

        {session.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {session.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(startDate, "EEE, MMM d")}</span>
            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
            <span>{format(startDate, "h:mm a")}</span>
          </div>
          
          {session.venue_name && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{session.venue_name}</span>
              {session.distance_km !== undefined && (
                <Badge variant="outline" className="text-xs ml-auto">
                  {session.distance_km < 1 
                    ? `${Math.round(session.distance_km * 1000)}m` 
                    : `${session.distance_km.toFixed(1)}km`}
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.participant_count} / {session.max_participants} going
            </span>
            {isFull && (
              <Badge variant="destructive" className="text-xs ml-auto">
                Full
              </Badge>
            )}
          </div>
        </div>

        {!isCreator && !isPast && (
          <Button
            onClick={handleJoin}
            disabled={loading || (isFull && !participation)}
            variant={participation ? "outline" : "gradient"}
            size="sm"
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : participation ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                {participation === 'going' ? "Going" : "Interested"}
              </>
            ) : isFull ? (
              "Full"
            ) : (
              "Join Session"
            )}
          </Button>
        )}

        {isCreator && (
          <Badge variant="secondary" className="w-full justify-center">
            You're hosting
          </Badge>
        )}

        {isPast && (
          <Badge variant="outline" className="w-full justify-center">
            Session ended
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};