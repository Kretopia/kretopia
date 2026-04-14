import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, CheckCircle, Search, Users, XCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant {
  id: string;
  user_id: string;
  check_in_token: string;
  checked_in_at: string | null;
  status: string | null;
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface EventCheckInDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventCheckInDialog = ({ eventId, eventTitle, open, onOpenChange }: EventCheckInDialogProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualToken, setManualToken] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jam_participants')
        .select('id, user_id, check_in_token, checked_in_at, status, joined_at')
        .eq('jam_id', eventId)
        .eq('status', 'going');

      if (error) throw error;

      // Fetch profiles for each participant
      const userIds = (data || []).map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setParticipants(
        (data || []).map(p => ({
          ...p,
          profile: profileMap.get(p.user_id) || undefined,
        }))
      );
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open) fetchParticipants();
  }, [open, fetchParticipants]);

  const checkInByToken = async (token: string) => {
    setCheckingIn(token);
    try {
      const participant = participants.find(p => p.check_in_token === token);
      if (!participant) {
        toast({ title: "Invalid QR Code", description: "No matching registration found for this event.", variant: "destructive" });
        return;
      }
      if (participant.checked_in_at) {
        toast({ title: "Already checked in", description: `${participant.profile?.full_name || 'This attendee'} was already checked in.` });
        return;
      }

      const { error } = await supabase
        .from('jam_participants')
        .update({ checked_in_at: new Date().toISOString() })
        .eq('id', participant.id);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p =>
          p.id === participant.id ? { ...p, checked_in_at: new Date().toISOString() } : p
        )
      );

      toast({ title: "✅ Checked in!", description: `${participant.profile?.full_name || 'Attendee'} is now checked in.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to check in. Please try again.", variant: "destructive" });
    } finally {
      setCheckingIn(null);
      setManualToken("");
    }
  };

  const checkInById = async (participantId: string) => {
    setCheckingIn(participantId);
    try {
      const { error } = await supabase
        .from('jam_participants')
        .update({ checked_in_at: new Date().toISOString() })
        .eq('id', participantId);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, checked_in_at: new Date().toISOString() } : p
        )
      );

      const participant = participants.find(p => p.id === participantId);
      toast({ title: "✅ Checked in!", description: `${participant?.profile?.full_name || 'Attendee'} is now checked in.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to check in.", variant: "destructive" });
    } finally {
      setCheckingIn(null);
    }
  };

  const checkedInCount = participants.filter(p => p.checked_in_at).length;

  const filteredParticipants = participants.filter(p => {
    if (!searchQuery) return true;
    const name = p.profile?.full_name?.toLowerCase() || '';
    const username = p.profile?.username?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || username.includes(searchQuery.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-lg">Check-In: {eventTitle}</DialogTitle>
          <div className="flex items-center gap-3 pt-1">
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {checkedInCount}/{participants.length} checked in
            </Badge>
          </div>
        </DialogHeader>

        {/* Manual Token Entry */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Scan or enter QR code</label>
          <div className="flex gap-2">
            <Input
              placeholder="Paste check-in token..."
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && manualToken.trim()) checkInByToken(manualToken.trim());
              }}
            />
            <Button
              size="sm"
              variant="gradient"
              disabled={!manualToken.trim() || !!checkingIn}
              onClick={() => checkInByToken(manualToken.trim())}
            >
              {checkingIn === manualToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search attendees..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Attendee List */}
        <ScrollArea className="max-h-[40vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No attendees found</p>
          ) : (
            <div className="space-y-2">
              {filteredParticipants.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {(p.profile?.full_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.profile?.full_name || 'Unknown'}</p>
                    {p.profile?.username && (
                      <p className="text-xs text-muted-foreground">@{p.profile.username}</p>
                    )}
                  </div>
                  {p.checked_in_at ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" /> In
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      disabled={!!checkingIn}
                      onClick={() => checkInById(p.id)}
                    >
                      {checkingIn === p.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Check In"
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
