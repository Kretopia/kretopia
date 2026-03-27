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
  Sparkles, ArrowRight, Check, Share2, Ticket, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { EventShareKit } from "@/components/sessions/EventShareKit";

const CATEGORY_LABELS: Record<string, string> = {
  music: '🎵 Music', film: '🎬 Film', photo: '📸 Photo', art: '🎨 Art',
  podcast: '🎙️ Podcast', workshop: '📚 Workshop', networking: '🤝 Networking',
  content: '📱 Content', festival: '🎪 Festival', showcase: '🌟 Showcase',
  general: '✨ Creative',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', IDR: 'Rp', TTD: 'TT$',
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
        .from('creative_jams').select('*').eq('id', eventId).eq('is_public', true).single();
      if (error || !eventData) { setEvent(null); setLoading(false); return; }
      setEvent(eventData);

      const { data: profileData } = await supabase
        .from('public_profiles_safe').select('full_name, avatar_url, role').eq('user_id', eventData.created_by).single();
      setCreator(profileData);

      const { count } = await supabase
        .from('jam_participants').select('*', { count: 'exact', head: true }).eq('jam_id', eventId).in('status', ['going', 'interested']);
      setParticipantCount(count || 0);

      if (user) {
        const { data: part } = await supabase
          .from('jam_participants').select('status').eq('jam_id', eventId).eq('user_id', user.id).maybeSingle();
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
        await supabase.from('jam_participants').delete().eq('jam_id', event.id).eq('user_id', user.id);
        setParticipation(null);
        setParticipantCount(prev => prev - 1);
        toast({ title: "Left event" });
      } else {
        await supabase.from('jam_participants').insert({ jam_id: event.id, user_id: user.id, status: 'going' });
        setParticipation('going');
        setParticipantCount(prev => prev + 1);
        toast({ title: "You're in! 🎉", description: "You've joined this event" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: event?.title, url }).catch(() => {});
    } else {
      setShowShareKit(true);
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
  const isTicketed = event.is_ticketed && event.ticket_price > 0;
  const currencySymbol = CURRENCY_SYMBOLS[event.ticket_currency || 'USD'] || '$';

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
        {/* Hero Cover */}
        {event.cover_image_url ? (
          <div className="relative h-48 sm:h-72 w-full">
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        ) : (
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
        )}

        <div className="max-w-2xl mx-auto px-4 pb-12 -mt-8 relative z-10">
          
          {/* Event Header */}
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-3 text-sm">
              {CATEGORY_LABELS[event.category] || event.category}
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3">{event.title}</h1>
            
            {/* Hosted By */}
            <div className="flex items-center justify-center gap-3 mb-4">
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
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center px-4 py-2 rounded-lg bg-primary/10">
                  <p className="text-2xl font-bold text-primary">{daysUntil}</p>
                  <p className="text-xs text-muted-foreground uppercase">Days</p>
                </div>
                <span className="text-2xl text-muted-foreground">:</span>
                <div className="text-center px-4 py-2 rounded-lg bg-primary/10">
                  <p className="text-2xl font-bold text-primary">{hoursUntil}</p>
                  <p className="text-xs text-muted-foreground uppercase">Hours</p>
                </div>
              </div>
            )}

            {/* Quick share */}
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground">
              <Share2 className="h-4 w-4 mr-1.5" /> Share Event
            </Button>
          </div>

          {/* Ticket Banner (for ticketed events) */}
          {isTicketed && !isPast && (
            <Card className="mb-6 border-primary/30 bg-primary/5 overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Ticket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{currencySymbol}{event.ticket_price.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">per ticket</p>
                  </div>
                </div>
                {participation ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 py-2 px-4">
                    <Check className="h-4 w-4 mr-1.5" /> Ticket Secured
                  </Badge>
                ) : (
                  <Button variant="gradient" onClick={handleJoinOrSignup} disabled={joining || isFull}>
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>{!isAuthenticated ? "Sign Up & Get Ticket" : isFull ? "Sold Out" : "Get Ticket"}</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Event Details Card */}
          <Card className="mb-6 overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-sm text-muted-foreground">{format(startDate, "h:mm a")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                {isAuthenticated ? (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{event.venue_name || 'Location TBA'}</p>
                    {event.venue_address && <p className="text-sm text-muted-foreground">{event.venue_address}</p>}
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
                {isAuthenticated && event.venue_address && (
                  <Button size="icon" variant="ghost" className="shrink-0" asChild>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(event.venue_address)}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{participantCount} / {event.max_participants || '∞'} going</p>
                  {isFull && <p className="text-xs text-destructive">This event is full</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {event.description && (
            <Card className="mb-6">
              <CardContent className="p-5">
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
              <Badge variant="outline" className="w-full justify-center py-3 text-base">This event has ended</Badge>
            ) : isCreator ? (
              <div className="space-y-3">
                <Badge variant="secondary" className="w-full justify-center py-3 text-base">You're hosting this event</Badge>
                <Button variant="outline" className="w-full" onClick={() => setShowShareKit(true)}>
                  <Share2 className="h-4 w-4 mr-2" /> Share Event
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
            ) : !isTicketed ? (
              <Button variant="gradient" className="w-full py-6 text-lg" onClick={handleJoinOrSignup} disabled={joining || isFull}>
                {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : !isAuthenticated ? (
                  <><Sparkles className="h-5 w-5 mr-2" /> Sign Up & Join Event <ArrowRight className="h-5 w-5 ml-2" /></>
                ) : isFull ? "Event Full" : (
                  <><Sparkles className="h-5 w-5 mr-2" /> Join Event</>
                )}
              </Button>
            ) : null}
          </div>

          {/* Powered by ThriveIN */}
          {!isAuthenticated && (
            <div className="text-center mt-8">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-primary">ThriveIN</span> — The Creative Community Platform
              </p>
            </div>
          )}

          {isAuthenticated && (
            <EventShareKit event={event} open={showShareKit} onOpenChange={setShowShareKit} />
          )}
        </div>
      </div>
    </>
  );
};

export default EventPage;
