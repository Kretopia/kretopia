import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendEventConfirmationEmail } from "@/utils/eventConfirmationEmail";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, Calendar, Clock, Users, Loader2, Lock, 
  Sparkles, ArrowRight, Check, Share2, Ticket, ExternalLink, Pencil, XCircle, ScanLine,
  MoreVertical, Crown, Ban, CheckCircle, Download, CalendarPlus, Navigation, MessageCircle,
  ArrowLeft, X
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import { EventShareKit } from "@/components/sessions/EventShareKit";
import { EditEventDialog } from "@/components/sessions/EditEventDialog";
import { EventCheckInDialog } from "@/components/sessions/EventCheckInDialog";
import { EventComments } from "@/components/sessions/EventComments";
import { EventCohosts } from "@/components/sessions/EventCohosts";
import { EventRecapButton } from "@/components/sessions/EventRecapButton";
import { EventGroupChatCard } from "@/components/sessions/EventGroupChatCard";
import { EventInlineChat } from "@/components/sessions/EventInlineChat";
import { EventGuestRoster } from "@/components/sessions/EventGuestRoster";
import { ShareToMessageDialog } from "@/components/messages/ShareToMessageDialog";
import { TicketPurchaseDialog } from "@/components/meetup/TicketPurchaseDialog";
import { GuestRsvpDialog } from "@/components/sessions/GuestRsvpDialog";
import { GuestPassDialog } from "@/components/sessions/GuestPassDialog";
import { BringAFriendCard } from "@/components/sessions/BringAFriendCard";
import { EventPhotoWall } from "@/components/sessions/EventPhotoWall";
import { JoinOnlineCard } from "@/components/sessions/JoinOnlineCard";
import { APP_URL } from "@/lib/constants";
import { downloadIcs, openDirections, captureRefFromUrl, buildWarmShareMessage, buildEventShareUrl } from "@/lib/eventActions";

const CATEGORY_LABELS: Record<string, string> = {
  music: 'Music', film: 'Film', photo: 'Photo', art: 'Art',
  podcast: '🎙Podcast', workshop: 'Workshop', networking: 'Networking',
  content: 'Content', festival: 'Festival', showcase: 'Showcase',
  general: 'Creative',
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
  const [attendeeAvatars, setAttendeeAvatars] = useState<{ avatar_url: string | null; full_name: string; role?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [participation, setParticipation] = useState<string | null>(null);
  const [showShareKit, setShowShareKit] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showGuestRsvp, setShowGuestRsvp] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCohosts, setShowCohosts] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showGuestPass, setShowGuestPass] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Tick every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (eventId) fetchEvent();
  }, [eventId, user]);

  // Handle Stripe redirect: verify ticket purchase and refresh
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketStatus = params.get("ticket");
    const sessionId = params.get("session_id");
    const orderId = params.get("order");
    if (ticketStatus === "success" && (sessionId || orderId)) {
      (async () => {
        try {
          const { data } = await supabase.functions.invoke("verify-event-ticket", {
            body: { sessionId, orderId },
          });
          if (data?.status === "paid") {
            toast({ title: "Ticket confirmed! 🎟️", description: "You're on the guest list." });
            fetchEvent();
          } else {
            toast({ title: "Processing payment…", description: "We'll confirm shortly." });
          }
        } catch {
          // silent
        } finally {
          // Clean URL
          window.history.replaceState({}, "", `/event/${eventId}`);
        }
      })();
    } else if (ticketStatus === "cancelled") {
      toast({ title: "Checkout cancelled", variant: "destructive" });
      window.history.replaceState({}, "", `/event/${eventId}`);
    }
  }, [eventId]);

  const fetchEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data: eventData, error } = await supabase
        .from('creative_jams').select('*').eq('id', eventId).eq('is_public', true).single();
      if (error || !eventData) { setEvent(null); setLoading(false); return; }
      setEvent(eventData);

      const { data: profileData } = await supabase
        .from('public_profiles_safe')
        .select('user_id, full_name, avatar_url, role, bio, id_verified, verification_status, verification_tier, badge, level')
        .eq('user_id', eventData.created_by)
        .single();

      // Also fetch host username (separate, since username is on profiles)
      const { data: hostUsername } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', eventData.created_by)
        .maybeSingle();

      // Count of public events this host has run (trust signal)
      const { count: hostedCount } = await supabase
        .from('creative_jams')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', eventData.created_by)
        .eq('is_public', true);

      setCreator({ ...profileData, username: hostUsername?.username, hostedCount: hostedCount || 0 });

      // Get participant count and avatars
      const { data: participants, count } = await supabase
        .from('jam_participants').select('user_id', { count: 'exact' }).eq('jam_id', eventId).in('status', ['going', 'interested']);
      setParticipantCount(count || 0);

      // Fetch first 12 attendee avatars + roles for richer social proof
      if (participants && participants.length > 0) {
        const userIds = participants.slice(0, 12).map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles').select('avatar_url, full_name, role').in('user_id', userIds);
        setAttendeeAvatars(profiles || []);
      }

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
    // External ticketing → redirect
    if (event?.external_ticket_url) {
      window.open(event.external_ticket_url, '_blank');
      return;
    }
    // Paid ticketed event → ticket dialog (Stripe collects email)
    if (event?.is_ticketed) {
      setShowTicketDialog(true);
      return;
    }
    // Free event: frictionless inline RSVP (works for guests AND logged-in users)
    setShowGuestRsvp(true);
  };

  const handleJoin = async () => {
    if (!user || !event) return;
    setJoining(true);
    try {
      if (participation) {
        // Cancel RSVP — frees the spot and triggers waitlist auto-promotion
        await supabase
          .from('jam_participants')
          .update({ status: 'cancelled' } as any)
          .eq('jam_id', event.id)
          .eq('user_id', user.id);
        setParticipation(null);
        setParticipantCount(prev => Math.max(0, prev - 1));
        toast({ title: "RSVP cancelled", description: "Your spot has been released." });
      } else {
        // Capture promoter/host attribution from ?ref= query
        const referredBy = await captureRefFromUrl(event.id);
        const { data: result, error } = await supabase.rpc('rsvp_to_event', {
          p_event_id: event.id,
          p_referred_by: referredBy && referredBy !== user.id ? referredBy : null,
          p_referral_channel: referredBy && referredBy !== user.id ? 'link' : null,
        });
        if (error) throw error;

        if (result === 'waitlisted') {
          toast({ title: "You're on the waitlist", description: "We'll notify you the moment a spot opens." });
        } else if (result === 'full_no_waitlist') {
          toast({ title: "Event is full", description: "The host hasn't enabled a waitlist for this one.", variant: "destructive" });
        } else if (result === 'already') {
          setParticipation('going');
          toast({ title: "Already going", description: "You're already on the guest list." });
        } else {
          // joined
          setParticipation('going');
          setParticipantCount(prev => prev + 1);
          toast({ title: "You're in!", description: "You've joined this event" });

          // Look up the new participant row to send confirmation email
          const { data: inserted } = await supabase
            .from('jam_participants')
            .select('id')
            .eq('jam_id', event.id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (inserted) {
            sendEventConfirmationEmail({
              eventId: event.id,
              eventTitle: event.title,
              startTime: event.start_time,
              endTime: event.end_time,
              venueName: event.venue_name,
              venueAddress: event.venue_address,
              isTicketed: false,
              participantId: inserted.id,
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('RSVP error:', err);
      toast({ title: "Error", description: "Failed to update RSVP", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  // Role breakdown for "Who's going" — top 2 roles (must run before any early return)
  const roleBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    attendeeAvatars.forEach(a => {
      const r = a.role?.trim();
      if (r) counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([role, n]) => `${n} ${role.toLowerCase()}${n > 1 ? 's' : ''}`);
  }, [attendeeAvatars]);

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
  const isCancelled = event.status === 'cancelled';
  const isCompleted = event.status === 'completed';
  const hasExternalTicket = !!event.external_ticket_url;

  const diff = startDate.getTime() - now.getTime();
  const daysUntil = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hoursUntil = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutesUntil = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
  const secondsUntil = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));
  const isImminent = diff > 0 && diff < 24 * 60 * 60 * 1000; // <24h shows mins+secs

  // Scarcity: capacity > 0, <30% remaining, not full
  const capacity = event.max_participants || 0;
  const spotsLeft = capacity > 0 ? capacity - participantCount : null;
  const showScarcity = capacity > 0 && spotsLeft !== null && spotsLeft > 0 && spotsLeft / capacity < 0.3;




  return (
    <>
      <SEO 
        title={`${event.title} | ThriveIN Event`}
        description={event.description?.slice(0, 155) || `Join ${creator?.full_name || 'a creator'} for ${event.title} on ThriveIN`}
        type="article"
        image={event.cover_image_url || undefined}
        url={`https://thrivein.io/event/${eventId}`}
      />
      {/* JSON-LD Event Schema */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            "name": event.title,
            "description": event.description || '',
            "startDate": event.start_time,
            "endDate": event.end_time || undefined,
            "eventAttendanceMode": event.event_type === 'virtual' 
              ? "https://schema.org/OnlineEventAttendanceMode" 
              : "https://schema.org/OfflineEventAttendanceMode",
            "location": event.venue_name ? {
              "@type": "Place",
              "name": event.venue_name,
              "address": event.venue_address || ''
            } : undefined,
            "image": event.cover_image_url || undefined,
            "organizer": {
              "@type": "Person",
              "name": creator?.full_name || 'ThriveIN Host'
            },
            "offers": event.is_ticketed && event.ticket_price ? {
              "@type": "Offer",
              "price": event.ticket_price,
              "priceCurrency": event.ticket_currency || "USD",
              "availability": isFull ? "https://schema.org/SoldOut" : "https://schema.org/InStock"
            } : undefined
          })}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Top nav: Back + Close */}
        <div className="sticky top-0 z-30 bg-background/95 border-b border-border/50">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 h-12 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/events"))}
              className="gap-1.5 -ml-2 h-9"
            >
              <ArrowLeft className="h-4 w-4" /> Events
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              aria-label="Close"
              className="h-9 w-9 -mr-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Hero Cover */}
        {event.cover_image_url ? (
          <div className="relative h-48 sm:h-72 w-full">
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        ) : (
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
        )}

        <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-24 -mt-8 relative z-10">
          
          {/* Cancelled/Completed Banner */}
          {isCancelled && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Event Cancelled</p>
                {event.status_note && <p className="text-sm text-muted-foreground">{event.status_note}</p>}
              </div>
            </div>
          )}
          {isCompleted && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600 shrink-0" />
              <p className="font-semibold text-green-600">Event Completed</p>
            </div>
          )}

          {/* Host Actions */}
          {isCreator && (
            <div className="flex justify-end gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={() => setShowCheckIn(true)} className="gap-1.5">
                <ScanLine className="h-3.5 w-3.5" /> Check-In
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/events/backstage")}>
                    <Sparkles className="h-4 w-4 mr-2" /> Open Backstage
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowShareKit(true)}>
                    <Share2 className="h-4 w-4 mr-2" /> Share / QR Code
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCohosts(true)}>
                    <Crown className="h-4 w-4 mr-2" /> Manage Co-hosts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRecap(true)}>
                    <Sparkles className="h-4 w-4 mr-2" /> Post Update / Recap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    const { data: parts } = await supabase
                      .from('jam_participants')
                      .select('user_id, status, joined_at')
                      .eq('jam_id', event.id)
                      .in('status', ['going', 'interested', 'maybe']);
                    const userIds = (parts || []).map((p: any) => p.user_id);
                    const { data: profiles } = userIds.length > 0
                      ? await supabase.from('profiles').select('user_id, full_name, role').in('user_id', userIds)
                      : { data: [] };
                    const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
                    const rows = [["Name", "Role", "Status", "Joined At"]];
                    if (creator) rows.push([creator.full_name || "Host", creator.role || "", "Host", ""]);
                    (parts || []).forEach((p: any) => {
                      const prof = pMap.get(p.user_id) as any;
                      rows.push([prof?.full_name || "Unknown", prof?.role || "", p.status, p.joined_at ? new Date(p.joined_at).toLocaleDateString() : ""]);
                    });
                    const csv = rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `guest-list-${event.id.slice(0, 8)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: "Guest list downloaded" });
                  }}>
                    <Download className="h-4 w-4 mr-2" /> Download Guest List
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!isPast && !isCompleted && (
                    <DropdownMenuItem onClick={async () => {
                      await supabase.from('creative_jams').update({ status: 'completed' } as any).eq('id', event.id).eq('created_by', user?.id || '');
                      toast({ title: "Event marked complete" });
                      fetchEvent();
                    }}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete
                    </DropdownMenuItem>
                  )}
                  {!isCancelled && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={async () => {
                        await supabase.from('creative_jams').update({ status: 'cancelled' } as any).eq('id', event.id).eq('created_by', user?.id || '');
                        toast({ title: "Event cancelled" });
                        fetchEvent();
                      }}
                    >
                      <Ban className="h-4 w-4 mr-2" /> Cancel Event
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          {/* Event Header */}
          <div className="text-center mb-4 sm:mb-6">
            <Badge variant="secondary" className="mb-2 sm:mb-3 text-xs sm:text-sm">
              {CATEGORY_LABELS[event.category] || event.category}
            </Badge>
            <h1 className="text-xl sm:text-4xl font-bold mb-2 sm:mb-3 leading-tight">{event.title}</h1>
            
            {/* Hosted By — trust card */}
            <button
              type="button"
              onClick={() => creator?.username && navigate(`/u/${creator.username}`)}
              className="inline-flex items-center justify-center gap-3 mb-4 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-100"
              disabled={!creator?.username}
            >
              <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                <AvatarImage src={creator?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {creator?.full_name?.charAt(0) || 'H'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your host</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm">{creator?.full_name || 'ThriveIN Host'}</p>
                  {creator?.id_verified && (
                    <CheckCircle className="h-3.5 w-3.5 text-primary" aria-label="Verified" />
                  )}
                </div>
                {(creator?.role || creator?.hostedCount > 0) && (
                  <p className="text-[11px] text-muted-foreground">
                    {creator?.role}
                    {creator?.role && creator?.hostedCount > 0 && ' · '}
                    {creator?.hostedCount > 0 && `${creator.hostedCount} ${creator.hostedCount === 1 ? 'event' : 'events'} hosted`}
                  </p>
                )}
              </div>
            </button>

            {/* Live countdown */}
            {!isPast && !isCancelled && diff > 0 && (
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="text-center px-3 py-1.5 rounded-lg bg-primary/10 min-w-[56px]">
                  <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{daysUntil}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Days</p>
                </div>
                <span className="text-xl text-muted-foreground">:</span>
                <div className="text-center px-3 py-1.5 rounded-lg bg-primary/10 min-w-[56px]">
                  <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{String(hoursUntil).padStart(2, '0')}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Hrs</p>
                </div>
                <span className="text-xl text-muted-foreground">:</span>
                <div className="text-center px-3 py-1.5 rounded-lg bg-primary/10 min-w-[56px]">
                  <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{String(minutesUntil).padStart(2, '0')}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Min</p>
                </div>
                {isImminent && (
                  <>
                    <span className="text-xl text-muted-foreground">:</span>
                    <div className="text-center px-3 py-1.5 rounded-lg bg-energy/15 border border-energy/40 min-w-[56px] animate-pulse">
                      <p className="text-xl sm:text-2xl font-bold text-energy tabular-nums">{String(secondsUntil).padStart(2, '0')}</p>
                      <p className="text-[10px] text-energy/80 uppercase">Sec</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Scarcity line */}
            {showScarcity && !isPast && !isCancelled && (
              <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-energy/15 border border-energy/40 text-energy text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
                Only {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
              </div>
            )}

            {/* Quick share */}
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground">
              <Share2 className="h-4 w-4 mr-1.5" /> Share with friends
            </Button>
          </div>

          {/* Who's going — bigger social proof above ticket/CTA */}
          {attendeeAvatars.length > 0 && !isPast && (
            <div className="mb-4 flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="flex -space-x-2.5">
                {attendeeAvatars.slice(0, 6).map((a, i) => (
                  <Avatar key={i} className="h-9 w-9 border-2 border-background">
                    <AvatarImage src={a.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {a.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {participantCount > 6 && (
                  <div className="h-9 w-9 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">+{participantCount - 6}</span>
                  </div>
                )}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-semibold">{participantCount} {participantCount === 1 ? 'person is' : 'people are'} going</p>
                <p className="text-xs text-muted-foreground truncate">
                  {roleBreakdown.length > 0 ? `Incl. ${roleBreakdown.join(', ')}` : 'Join the crew'}
                </p>
              </div>
            </div>
          )}

          {/* Online room (only for online/hybrid events) */}
          {event.event_mode && event.event_mode !== 'irl' && !isPast && !isCancelled && (
            <JoinOnlineCard
              eventId={event.id}
              eventTitle={event.title}
              startTime={event.start_time}
              eventMode={event.event_mode}
              onlineFormat={event.online_format}
              onlineMaxAttendees={event.online_max_attendees}
              watchPartyVideoUrl={event.watch_party_video_url}
              recordingEnabled={!!event.recording_enabled}
              videoRoomStartedAt={event.video_room_started_at}
              hasAccess={isCreator || !!participation || (isTicketed && !!participation)}
              needsRsvp={!participation && !isTicketed}
              isHost={isCreator}
            />
          )}

          {/* Ticket Banner (for ticketed events) */}
          {isTicketed && !isPast && !isCancelled && (
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
                      <>
                        {!isAuthenticated ? "Sign Up & Get Ticket" : isFull ? "Sold Out" : hasExternalTicket ? (
                          <><ExternalLink className="h-4 w-4 mr-1.5" /> Get Ticket</>
                        ) : "Get Ticket"}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
              {hasExternalTicket && (
                <div className="px-5 pb-3">
                  <p className="text-xs text-muted-foreground">Tickets via external platform</p>
                </div>
              )}
            </Card>
          )}

          {/* Event Details Card */}
          <Card className="mb-6 overflow-hidden">
            <CardContent className="p-5 space-y-4">
              {/* When */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">When</p>
                  <p className="font-medium">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-sm text-muted-foreground">{format(startDate, "h:mm a")}{event.end_time ? ` – ${format(new Date(event.end_time), "h:mm a")}` : ''}</p>
                </div>
                {!isPast && !isCancelled && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => downloadIcs({
                      id: event.id,
                      title: event.title,
                      description: event.description,
                      startTime: event.start_time,
                      endTime: event.end_time,
                      venueName: event.venue_name,
                      venueAddress: event.venue_address,
                      url: `${APP_URL}/event/${event.id}`,
                    })}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Add to Calendar</span>
                    <span className="sm:hidden">Save</span>
                  </Button>
                )}
              </div>

              {/* Where */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                {isAuthenticated ? (
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Where</p>
                    <p className="font-medium truncate">{event.venue_name || 'Location TBA'}</p>
                    {event.venue_address && <p className="text-sm text-muted-foreground line-clamp-2">{event.venue_address}</p>}
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Where</p>
                    <p className="font-medium text-muted-foreground">
                      {event.venue_name ? event.venue_name.split(',')[0] + '…' : 'Location hidden'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Sign up to see full location
                    </p>
                  </div>
                )}
                {isAuthenticated && (event.venue_address || event.venue_name) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => openDirections(event.venue_address, event.venue_name)}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Directions</span>
                    <span className="sm:hidden">Map</span>
                  </Button>
                )}
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Who's coming</p>
                  <p className="font-medium">{participantCount}{event.max_participants ? ` of ${event.max_participants}` : ''} going</p>
                  {isFull && <p className="text-xs text-destructive">This one's full — try the waitlist</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {event.description && (
            <Card className="mb-6">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">The vibe</h3>
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

          {/* Guest Roster — Match/Circle-style discovery before the event */}
          <EventGuestRoster
            eventId={event.id}
            eventTitle={event.title}
            hostId={event.created_by}
            currentUserId={user?.id || null}
            isParticipant={!!participation}
            isHost={isCreator}
            participantCount={participantCount}
          />

          {/* Group Chat — host toggle + opt-in for RSVPs */}
          {isAuthenticated && (
            <EventGroupChatCard
              eventId={event.id}
              eventTitle={event.title}
              isHost={isCreator}
              isParticipant={!!participation}
              hostId={event.created_by}
              groupChatEnabled={!!event.group_chat_enabled}
              groupChatRoomId={event.group_chat_room_id || null}
              onChange={({ enabled, roomId }) => setEvent((prev: any) => prev ? { ...prev, group_chat_enabled: enabled, group_chat_room_id: roomId } : prev)}
            />
          )}

          {/* Inline event chat — lives on the event page until the event wraps.
              After the event, it collapses to a "moved to Messages" link so the
              conversation can continue in the Groups inbox. */}
          {isAuthenticated && event.group_chat_enabled && event.group_chat_room_id && (isCreator || !!participation) && (
            <EventInlineChat
              roomId={event.group_chat_room_id}
              currentUserId={user!.id}
              archived={isPast || isCompleted}
            />
          )}

          {/* Bring a +1 — RSVP'd guests get a personal invite link with attribution */}
          {!!participation && !isPast && !isCompleted && !isCancelled && (
            <BringAFriendCard
              event={event}
              hostFirstName={creator?.first_name || creator?.full_name?.split(" ")[0] || null}
              attendeeCount={participantCount}
            />
          )}

          {/* Photo Wall — visible during/after event for attendees */}
          {(isPast || isCompleted) && event.photo_wall_enabled !== false && (
            <EventPhotoWall
              eventId={event.id}
              isHost={isCreator}
              canUpload={isCreator || !!participation}
            />
          )}

          {/* CTA */}
          {!isCancelled && (
            <div className="space-y-3">
              {isPast || isCompleted ? (
                <Badge variant="outline" className="w-full justify-center py-3 text-base">This event has wrapped</Badge>
              ) : isCreator ? (
                <div className="space-y-3">
                  <Badge variant="secondary" className="w-full justify-center py-3 text-base">You're hosting</Badge>
                  <Button variant="outline" className="w-full" onClick={() => setShowShareKit(true)}>
                    <Share2 className="h-4 w-4 mr-2" /> Share with your network
                  </Button>
                </div>
              ) : participation ? (
                <div className="space-y-3">
                  {/* Primary: Show my pass — most important for guest on event day */}
                  <Button
                    variant="gradient"
                    className="w-full py-6 text-base"
                    onClick={() => setShowGuestPass(true)}
                  >
                    <Ticket className="h-5 w-5 mr-2" /> Show my pass
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleJoin} disabled={joining} className="text-xs sm:text-sm">
                      {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <><Check className="h-4 w-4 mr-1.5" /> You're in</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowShareKit(true)} className="text-xs sm:text-sm">
                      <Share2 className="h-4 w-4 mr-1.5" /> Tell a friend
                    </Button>
                  </div>
                  <p className="text-[11px] text-center text-muted-foreground">Tap "You're in" again to cancel</p>
                </div>
              ) : !isTicketed ? (
                <Button variant="gradient" className="w-full py-6 text-lg" onClick={handleJoinOrSignup} disabled={joining || isFull}>
                  {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : !isAuthenticated ? (
                    <><Sparkles className="h-5 w-5 mr-2" /> Save my spot <ArrowRight className="h-5 w-5 ml-2" /></>
                  ) : isFull ? "All spots taken" : (
                    <><Sparkles className="h-5 w-5 mr-2" /> Save my spot</>
                  )}
                </Button>
              ) : null}
            </div>
          )}

          {/* Powered by ThriveIN */}
          {!isAuthenticated && (
            <div className="text-center mt-8">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-primary">ThriveIN</span> — The Creative Community Platform
              </p>
            </div>
          )}

          {isAuthenticated && (
            <EventShareKit
              event={event}
              hostFirstName={creator?.full_name?.split(" ")[0]}
              attendeeCount={participantCount}
              open={showShareKit}
              onOpenChange={setShowShareKit}
            />
          )}

          <ShareToMessageDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            contentType="event"
            contentId={event.id}
            contentMeta={{
              title: event.title,
              subtitle: event.venue_name || undefined,
              image_url: event.cover_image_url,
            }}
            externalUrl={buildEventShareUrl(event.id)}
            externalText={
              buildWarmShareMessage(
                {
                  id: event.id,
                  title: event.title,
                  startTime: event.start_time,
                  venueName: event.venue_name,
                  isTicketed: event.is_ticketed,
                  ticketPrice: event.ticket_price,
                  ticketCurrency: event.ticket_currency,
                  attendeeCount: participantCount,
                },
                {
                  hostFirstName: creator?.full_name?.split(" ")[0],
                  isHost: isCreator,
                }
              ).text
            }
          />

          <TicketPurchaseDialog
            open={showTicketDialog}
            onOpenChange={setShowTicketDialog}
            eventId={event.id}
            eventTitle={event.title}
            onSuccess={() => {
              setParticipation('going');
              setParticipantCount(prev => prev + 1);
            }}
          />

          <GuestRsvpDialog
            open={showGuestRsvp}
            onOpenChange={setShowGuestRsvp}
            eventId={event.id}
            eventTitle={event.title}
            onRsvpComplete={() => {
              setParticipation('going');
              setParticipantCount(prev => prev + 1);
            }}
          />

          {user && participation && (
            <GuestPassDialog
              open={showGuestPass}
              onOpenChange={setShowGuestPass}
              eventId={event.id}
              eventTitle={event.title}
              startTime={event.start_time}
              venueName={event.venue_name}
              userId={user.id}
              guestName={user.user_metadata?.full_name || user.email}
            />
          )}
          
          {isCreator && (
            <EditEventDialog 
              eventId={event.id} 
              open={showEditDialog} 
              onOpenChange={setShowEditDialog} 
              onUpdated={fetchEvent}
            />
          )}
          {isCreator && (
            <EventCheckInDialog
              eventId={event.id}
              eventTitle={event.title}
              open={showCheckIn}
              onOpenChange={setShowCheckIn}
            />
          )}
          {isCreator && showCohosts && (
            <Dialog open={showCohosts} onOpenChange={setShowCohosts}>
              <DialogContent className="max-w-md">
                <EventCohosts eventId={event.id} isCreator={isCreator} />
              </DialogContent>
            </Dialog>
          )}
          {isCreator && showRecap && (
            <Dialog open={showRecap} onOpenChange={setShowRecap}>
              <DialogContent className="max-w-sm">
                <div className="space-y-4 py-2">
                  <h3 className="font-semibold text-lg">Post Event Update / Recap</h3>
                  <p className="text-sm text-muted-foreground">Share an update or recap of this event to your feed so your network can see what's happening.</p>
                  <EventRecapButton
                    eventId={event.id}
                    eventTitle={event.title}
                    eventCategory={event.category}
                    venueName={event.venue_name}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </>
  );
};

export default EventPage;
