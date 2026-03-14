import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Clock, Users, Check, Loader2, MessageCircle, Settings, Share2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SessionParticipants } from "./SessionParticipants";
import { SessionChat } from "./SessionChat";
import { EventShareKit } from "./EventShareKit";

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
}

interface SessionDetailDialogProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
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
  general: '✨ Creative',
};

export const SessionDetailDialog = ({ 
  session, 
  open, 
  onOpenChange,
  onRefresh 
}: SessionDetailDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [participation, setParticipation] = useState<'going' | 'interested' | 'maybe' | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showShareKit, setShowShareKit] = useState(false);

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
    
    if (data) {
      setParticipation(data.status as 'going' | 'interested' | 'maybe');
    } else {
      setParticipation(null);
    }
  };

  const handleJoin = async () => {
    if (!user || !session) {
      toast({
        title: "Not authenticated",
        description: "Please log in to join sessions",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (participation) {
        await supabase
          .from('jam_participants')
          .delete()
          .eq('jam_id', session.id)
          .eq('user_id', user.id);
        
        setParticipation(null);
        toast({ title: "Left session" });
      } else {
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
      onRefresh?.();
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

  if (!session) return null;

  const isCreator = user?.id === session.created_by;
  const isFull = session.participant_count >= session.max_participants;
  const startDate = new Date(session.start_time);
  const isPast = startDate < new Date();
  const isParticipant = !!participation || isCreator;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-amber-500/30">
              <AvatarImage src={session.creator_avatar} />
              <AvatarFallback className="bg-amber-500/10 text-amber-600">
                {session.creator_name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <DialogTitle className="text-xl">{session.title}</DialogTitle>
                <Badge variant="secondary" className="shrink-0">
                  {CATEGORY_LABELS[session.category] || session.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Hosted by {session.creator_name}</p>
              
              <div className="flex flex-wrap gap-3 mt-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(startDate, "EEE, MMM d")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{format(startDate, "h:mm a")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{session.participant_count}/{session.max_participants}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 w-fit shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="h-4 w-4 mr-1.5" />
              People ({session.participant_count})
            </TabsTrigger>
            {isParticipant && (
              <TabsTrigger value="chat">
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Chat
              </TabsTrigger>
            )}
            {isCreator && (
              <TabsTrigger value="manage">
                <Settings className="h-4 w-4 mr-1.5" />
                Manage
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="details" className="h-full overflow-y-auto px-6 py-4 m-0">
              <div className="space-y-6">
                {session.description && (
                  <div>
                    <h4 className="font-medium mb-2">About</h4>
                    <p className="text-muted-foreground">{session.description}</p>
                  </div>
                )}

                {session.venue_name && (
                  <div>
                    <h4 className="font-medium mb-2">Location</h4>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{session.venue_name}</p>
                        {session.venue_address && (
                          <p className="text-sm">{session.venue_address}</p>
                        )}
                        {session.distance_km !== undefined && (
                          <p className="text-sm text-amber-600 mt-1">
                            {session.distance_km < 1 
                              ? `${Math.round(session.distance_km * 1000)}m away` 
                              : `${session.distance_km.toFixed(1)}km away`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Join/Leave Button */}
                {!isPast && (
                  <div className="pt-4">
                    {isCreator ? (
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        You're hosting this session
                      </Badge>
                    ) : (
                      <Button
                        onClick={handleJoin}
                        disabled={loading || (isFull && !participation)}
                        variant={participation ? "outline" : "default"}
                        className="w-full"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : participation ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Going - Click to Leave
                          </>
                        ) : isFull ? (
                          "Session Full"
                        ) : (
                          "Join Session"
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {isPast && (
                  <Badge variant="outline" className="w-full justify-center py-2">
                    This session has ended
                  </Badge>
                )}
              </div>
            </TabsContent>

            <TabsContent value="participants" className="h-full overflow-y-auto m-0">
              <SessionParticipants 
                sessionId={session.id} 
                creatorId={session.created_by}
                isCreator={isCreator}
                onRefresh={onRefresh}
              />
            </TabsContent>

            {isParticipant && (
              <TabsContent value="chat" className="h-full m-0 flex flex-col overflow-hidden">
                <SessionChat 
                  sessionId={session.id}
                  isCreator={isCreator}
                />
              </TabsContent>
            )}

            {isCreator && (
              <TabsContent value="manage" className="h-full overflow-y-auto px-6 py-4 m-0">
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowShareKit(true)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Event Link
                  </Button>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Moderation</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      As the host, you can remove participants and delete messages to keep the space safe.
                    </p>
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
  );
};
