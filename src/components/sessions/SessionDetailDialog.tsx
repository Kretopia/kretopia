import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, Calendar, Clock, Users, Check, Loader2, 
  MessageCircle, Settings, Share2, Ticket, X, ExternalLink, Pencil
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SessionParticipants } from "./SessionParticipants";
import { SessionChat } from "./SessionChat";
import { EventShareKit } from "./EventShareKit";
import { EditEventDialog } from "./EditEventDialog";

import { EventCohosts } from "./EventCohosts";
import { EventRecapButton } from "./EventRecapButton";

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
  cover_image_url?: string;
  is_ticketed?: boolean;
  ticket_price?: number;
  ticket_currency?: string;
  event_type?: string;
  external_ticket_url?: string;
  status?: string;
  status_note?: string;
}

interface SessionDetailDialogProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  music: '🎵 Music', film: '🎬 Film', photo: '📸 Photo', art: '🎨 Art',
  podcast: '🎙️ Podcast', workshop: '📚 Workshop', networking: '🤝 Networking',
  content: '📱 Content', festival: '🎪 Festival', showcase: '🌟 Showcase',
  general: '✨ Creative',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', IDR: 'Rp', TTD: 'TT$',
};

export const SessionDetailDialog = ({ 
  session, open, onOpenChange, onRefresh 
}: SessionDetailDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [participation, setParticipation] = useState<'going' | 'interested' | 'maybe' | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showShareKit, setShowShareKit] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (open && session && user) {
      checkParticipation();
    }
  }, [open, session, user]);

  const checkParticipation = async () => {
    if (!session || !user) return;
    const { data } = await supabase
      .from('jam_participants')
      .select('status')
      .eq('jam_id', session.id)
      .eq('user_id', user.id)
      .maybeSingle();
    setParticipation(data?.status as any || null);
  };

  const handleJoin = async () => {
    if (!user || !session) {
      toast({ title: "Not authenticated", description: "Please log in to join events", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (participation) {
        await supabase.from('jam_participants').delete().eq('jam_id', session.id).eq('user_id', user.id);
        setParticipation(null);
        toast({ title: "Left event" });
      } else {
        await supabase.from('jam_participants').insert({ jam_id: session.id, user_id: user.id, status: 'going' });
        setParticipation('going');
        toast({ title: "You're in! 🎉" });
      }
      onRefresh?.();
    } catch {
      toast({ title: "Error", description: "Failed to update participation", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const isCreator = user?.id === session.created_by;
  const isFull = session.participant_count >= session.max_participants;
  const startDate = new Date(session.start_time);
  const isPast = startDate < new Date();
  const isParticipant = !!participation || isCreator;
  const isTicketed = session.is_ticketed && session.ticket_price && session.ticket_price > 0;
  const currencySymbol = CURRENCY_SYMBOLS[session.ticket_currency || 'USD'] || session.ticket_currency || '$';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] h-[100dvh] sm:h-[85vh] flex flex-col p-0 overflow-hidden gap-0 rounded-none sm:rounded-lg">
          {/* Hero Cover Image */}
          <div className="relative shrink-0">
            {session.cover_image_url ? (
              <div className="relative h-44 sm:h-56">
                <img src={session.cover_image_url} alt={session.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </div>
            ) : (
              <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
            )}
            
            {/* Close button */}
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 bg-background/60 backdrop-blur-sm hover:bg-background/80 rounded-full"
              onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>

            {/* Category badge */}
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
              {CATEGORY_LABELS[session.category] || session.category}
            </Badge>
          </div>

          {/* Event Info Header */}
          <div className="px-4 sm:px-5 pb-4 pt-3 border-b shrink-0 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-primary/30 shrink-0">
                <AvatarImage src={session.creator_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {session.creator_name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold leading-tight">{session.title}</h2>
                <p className="text-sm text-muted-foreground">Hosted by {session.creator_name}</p>
              </div>
            </div>

            {/* Quick Info Row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {format(startDate, "EEE, MMM d")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {format(startDate, "h:mm a")}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {session.participant_count}/{session.max_participants}
              </span>
              {isTicketed && (
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Ticket className="h-3.5 w-3.5" /> {currencySymbol}{session.ticket_price?.toFixed(2)}
                </span>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex gap-2">
              {!isPast && !isCreator && session.status !== 'cancelled' && (
                <Button
                  onClick={() => {
                    if (session.external_ticket_url && !participation) {
                      window.open(session.external_ticket_url, '_blank');
                      return;
                    }
                    handleJoin();
                  }}
                  disabled={loading || (isFull && !participation)}
                  variant={participation ? "outline" : "gradient"}
                  size="sm"
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : participation ? (
                    <><Check className="h-4 w-4 mr-1.5" /> Going</>
                  ) : isTicketed ? (
                    <>{session.external_ticket_url ? <ExternalLink className="h-4 w-4 mr-1.5" /> : <Ticket className="h-4 w-4 mr-1.5" />} Get Ticket — {currencySymbol}{session.ticket_price}</>
                  ) : isFull ? "Full" : "Join Event"}
                </Button>
              )}
              {session.status === 'cancelled' && (
                <Badge variant="destructive" className="flex-1 justify-center py-2">Event Cancelled</Badge>
              )}
              {isCreator && !isPast && session.status !== 'cancelled' && (
                <Badge variant="secondary" className="flex-1 justify-center py-2">You're hosting</Badge>
              )}
              {isPast && session.status !== 'cancelled' && (
                <Badge variant="outline" className="flex-1 justify-center py-2">Event ended</Badge>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowShareKit(true)} className="gap-1.5">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="mx-3 sm:mx-5 mt-3 overflow-x-auto scrollbar-hide shrink-0">
            <TabsList className="w-max">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="participants">
                <Users className="h-4 w-4 mr-1" /> People ({session.participant_count})
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageCircle className="h-4 w-4 mr-1" /> Chat
              </TabsTrigger>
              {isCreator && (
                <TabsTrigger value="manage">
                  <Settings className="h-4 w-4 mr-1" /> Manage
                </TabsTrigger>
              )}
            </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="details" className="h-full overflow-y-auto px-4 sm:px-5 py-4 m-0">
                <div className="space-y-5">
                  {session.description && (
                    <div>
                      <h4 className="font-semibold mb-2">About</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{session.description}</p>
                    </div>
                  )}

                  {session.venue_name && (
                    <div>
                      <h4 className="font-semibold mb-2">Location</h4>
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                        <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{session.venue_name}</p>
                          {session.venue_address && <p className="text-sm text-muted-foreground">{session.venue_address}</p>}
                          {session.distance_km !== undefined && (
                            <p className="text-sm text-primary mt-1">
                              {session.distance_km < 1 ? `${Math.round(session.distance_km * 1000)}m away` : `${session.distance_km.toFixed(1)}km away`}
                            </p>
                          )}
                        </div>
                        {session.venue_address && (
                          <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" asChild>
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(session.venue_address)}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ticket Info */}
                  {isTicketed && (
                    <div>
                      <h4 className="font-semibold mb-2">Tickets</h4>
                      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-lg">{currencySymbol}{session.ticket_price?.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">General Admission</p>
                          </div>
                          {!isCreator && !isPast && !participation && (
                            <Button variant="gradient" size="sm" onClick={() => {
                              if (session.external_ticket_url) {
                                window.open(session.external_ticket_url, '_blank');
                              } else {
                                handleJoin();
                              }
                            }} disabled={loading || isFull}>
                              <Ticket className="h-4 w-4 mr-1.5" /> Get Ticket
                            </Button>
                          )}
                          {participation && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <Check className="h-3 w-3 mr-1" /> Ticket Secured
                            </Badge>
                          )}
                        </div>
                        {session.external_ticket_url && (
                          <p className="text-xs text-muted-foreground mt-2">🔗 Tickets via external platform</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="chat" className="h-full m-0 flex flex-col overflow-hidden">
                <SessionChat sessionId={session.id} isCreator={isCreator} />
              </TabsContent>

              {isCreator && (
                <TabsContent value="manage" className="h-full overflow-y-auto px-4 sm:px-5 py-4 m-0">
                  <div className="space-y-4">
                    <Button variant="default" className="w-full gap-2" onClick={() => setShowEditDialog(true)}>
                      <Pencil className="h-4 w-4" /> Edit Event Details
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setShowShareKit(true)}>
                      <Share2 className="h-4 w-4 mr-2" /> Share Event / Get QR Code
                    </Button>
                    
                    {/* Co-hosts */}
                    <EventCohosts eventId={session.id} isCreator={isCreator} />

                    {/* Post-event recap */}
                    {isPast && (
                      <EventRecapButton 
                        eventId={session.id} 
                        eventTitle={session.title} 
                        eventCategory={session.category}
                        venueName={session.venue_name}
                      />
                    )}

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Moderation</h4>
                      <p className="text-sm text-muted-foreground mb-3">As the host, you can remove participants and manage the event space.</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Go to "People" tab to remove participants</li>
                        <li>• Go to "Chat" tab to delete inappropriate messages</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {session && (
        <EventShareKit event={session} open={showShareKit} onOpenChange={setShowShareKit} />
      )}
      {session && isCreator && (
        <EditEventDialog 
          eventId={session.id} 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog} 
          onUpdated={() => { onRefresh?.(); onOpenChange(false); }}
        />
      )}
    </>
  );
};
