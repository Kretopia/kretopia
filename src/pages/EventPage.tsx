import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, Calendar, Clock, Users, Loader2, Lock, 
  Sparkles, ArrowRight, Check, Share2 
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { EventShareKit } from "@/components/sessions/EventShareKit";

const CATEGORY_LABELS: Record<string, string> = {
  music: '🎵 Music', film: '🎬 Film', photo: '📸 Photo', art: '🎨 Art',
  podcast: '🎙️ Podcast', workshop: '📚 Workshop', networking: '🤝 Networking',
  content: '📱 Content', general: '✨ Creative',
};

const EventPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [participation, setParticipation] = useState<string | null>(null);
  const [showShareKit, setShowShareKit] = useState(false);

  useEffect(() => {
    if (eventId) fetchEvent();
  }, [eventId, user]);

  const fetchEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data: eventData, error } = await supabase
        .from('creative_jams')
        .select('*')
        .eq('id', eventId)
        .eq('is_public', true)
        .single();
      
      if (error || !eventData) {
        setEvent(null);
        setLoading(false);
        return;
      }
      setEvent(eventData);

      // Fetch creator profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('user_id', eventData.created_by)
        .single();
      setCreator(profileData);

      // Get participant count
      const { count } = await supabase
        .from('jam_participants')
        .select('*', { count: 'exact', head: true })
        .eq('jam_id', eventId)
        .in('status', ['going', 'interested']);
      setParticipantCount(count || 0);

      // Check if current user is already participating
      if (user) {
        const { data: part } = await supabase
          .from('jam_participants')
          .select('status')
          .eq('jam_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();
        setParticipation(part?.status || null);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrSignup = () => {
    if (!user) {
      // Store event ID for auto-join after signup
      sessionStorage.setItem('pending_event_join', eventId!);
      navigate('/auth?event=' + eventId);
      return;
    }
    handleJoin();
  };

  const handleJoin = async () => {
    if (!user || !event) return;
    setJoining(true);
    try {
      if (participation) {
        await supabase
          .from('jam_participants')
          .delete()
          .eq('jam_id', event.id)
          .eq('user_id', user.id);
        setParticipation(null);
        setParticipantCount(prev => prev - 1);
        toast({ title: "Left event" });
      } else {
        await supabase
          .from('jam_participants')
          .insert({ jam_id: event.id, user_id: user.id, status: 'going' });
        setParticipation('going');
        setParticipantCount(prev => prev + 1);
        toast({ title: "You're in! 🎉", description: "You've joined this event" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Event not found</h2>
            <p className="text-muted-foreground mb-6">This event may have been removed or is no longer available.</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(event.start_time);
  const isPast = startDate < new Date();
  const isFull = participantCount >= (event.max_participants || 999);
  const isCreator = user?.id === event.created_by;
  const isAuthenticated = !!user;

  // Calculate countdown
  const now = new Date();
  const diff = startDate.getTime() - now.getTime();
  const daysUntil = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hoursUntil = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return (
    <>
      <SEO 
        title={`${event.title} | ThriveIN Event`}
        description={event.description || `Join ${creator?.full_name || 'a creator'} for ${event.title} on ThriveIN`}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-2xl mx-auto px-4 py-8">
          
          {/* Event Header */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 text-sm">
              {CATEGORY_LABELS[event.category] || event.category}
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">{event.title}</h1>
            
            {/* Hosted By */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={creator?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {creator?.full_name?.charAt(0) || 'H'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-medium text-sm">{creator?.full_name || 'ThriveIN Host'}</p>
                <p className="text-xs text-muted-foreground">{creator?.role || 'Creator'}</p>
              </div>
            </div>

            {/* Countdown */}
            {!isPast && diff > 0 && (
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{daysUntil}</p>
                  <p className="text-xs text-muted-foreground uppercase">Days</p>
                </div>
                <span className="text-2xl text-muted-foreground">:</span>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{hoursUntil}</p>
                  <p className="text-xs text-muted-foreground uppercase">Hours</p>
                </div>
              </div>
            )}
          </div>

          {/* Event Details Card */}
          <Card className="mb-6 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              {/* Date & Time */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-sm text-muted-foreground">{format(startDate, "h:mm a")}</p>
                </div>
              </div>

              {/* Venue - Teaser for non-auth */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                {isAuthenticated ? (
                  <div>
                    <p className="font-medium">{event.venue_name || 'Location TBA'}</p>
                    {event.venue_address && (
                      <p className="text-sm text-muted-foreground">{event.venue_address}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-muted-foreground">
                      {event.venue_name ? event.venue_name.split(',')[0] + '...' : 'Location hidden'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Sign up to see full location
                    </p>
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{participantCount} / {event.max_participants || '∞'} going</p>
                  {isFull && <p className="text-xs text-destructive">This event is full</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description - Teaser for non-auth */}
          {event.description && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">About this event</h3>
                {isAuthenticated ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                ) : (
                  <div className="relative">
                    <p className="text-muted-foreground line-clamp-3">{event.description}</p>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Sign up to read more
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <div className="space-y-3">
            {isPast ? (
              <Badge variant="outline" className="w-full justify-center py-3 text-base">
                This event has ended
              </Badge>
            ) : isCreator ? (
              <div className="space-y-3">
                <Badge variant="secondary" className="w-full justify-center py-3 text-base">
                  You're hosting this event
                </Badge>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowShareKit(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>
              </div>
            ) : participation ? (
              <div className="space-y-3">
                <Button variant="outline" className="w-full" onClick={handleJoin} disabled={joining}>
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><Check className="h-4 w-4 mr-2" /> You're going — Tap to leave</>
                  )}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setShowShareKit(true)}>
                  <Share2 className="h-4 w-4 mr-2" /> Share with friends
                </Button>
              </div>
            ) : (
              <Button 
                variant="gradient" 
                className="w-full py-6 text-lg"
                onClick={handleJoinOrSignup}
                disabled={joining || isFull}
              >
                {joining ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : !isAuthenticated ? (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Sign Up & Join Event
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                ) : isFull ? (
                  "Event Full"
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Join Event
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Powered by ThriveIN */}
          {!isAuthenticated && (
            <div className="text-center mt-8">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-primary">ThriveIN</span> — The Creative Community Platform
              </p>
            </div>
          )}

          {/* Share kit for authenticated users */}
          {isAuthenticated && (
            <EventShareKit
              event={event}
              open={showShareKit}
              onOpenChange={setShowShareKit}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default EventPage;
