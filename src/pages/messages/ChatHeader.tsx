import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreVertical, Trash2, Briefcase, FolderPlus, Video, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OnlineDot } from "@/components/messages/OnlinePresence";
import { InviteToProjectDialog } from "@/components/project/InviteToProjectDialog";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ringUsers } from "@/hooks/useIncomingCall";
import type { OtherUser } from "./types";

interface Props {
  otherUser: OtherUser;
  isOnline: boolean;
  onBack: () => void;
  onViewProfile: () => void;
  onStartProject: () => void;
}

export const ChatHeader = ({ otherUser, isOnline, onBack, onViewProfile, onStartProject }: Props) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const recipientId = (otherUser as any).id || (otherUser as any).user_id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callRoomUrl, setCallRoomUrl] = useState<string | null>(null);
  const [callRoomName, setCallRoomName] = useState<string | null>(null);
  const [callToken, setCallToken] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);

  const myName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Someone";

  const handleStartCall = async () => {
    if (!recipientId || starting) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-direct-video-call", {
        body: { invited_user_id: recipientId, user_name: myName },
      });
      if (error) throw error;
      if (!data?.room_url || !data?.token) throw new Error("No room");

      setCallRoomUrl(data.room_url);
      setCallRoomName(data.room_name);
      setCallToken(data.token);
      setCallId(data.call_id);
      setCallOpen(true);

      // Ring the recipient via Realtime
      void ringUsers([recipientId], {
        kind: "direct",
        callerId: user!.id,
        callerName: myName,
        callerAvatar: user?.user_metadata?.avatar_url ?? null,
        roomUrl: data.room_url,
        roomName: data.room_name,
        callId: data.call_id ?? null,
      });
    } catch (e: any) {
      console.error("[ChatHeader call]", e);
      toast({
        title: "Couldn't start call",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2.5 sm:gap-3 bg-card">
      <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="relative">
        <Avatar className="h-9 w-9 sm:h-11 sm:w-11 cursor-pointer border-2 border-background" onClick={onViewProfile}>
          <AvatarImage src={otherUser.avatar} />
          <AvatarFallback className="text-sm sm:text-lg">
            {(otherUser.name || 'U').split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <OnlineDot isOnline={isOnline} />
      </div>
      <div className="flex-1 cursor-pointer" onClick={onViewProfile}>
        <h3 className="font-semibold hover:underline">{otherUser.name || 'Unknown'}</h3>
        <p className="text-xs text-muted-foreground">
          {isOnline ? <span className="text-success">Online</span> : (otherUser.role || '')}
        </p>
      </div>
      <Button variant="outline" size="sm" className="hidden sm:flex gap-2" onClick={onStartProject}>
        <Briefcase className="h-4 w-4" />
        Start Project
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onViewProfile}>View Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={onStartProject} className="sm:hidden">
            <Briefcase className="h-4 w-4 mr-2" />
            Start Project Together
          </DropdownMenuItem>
          {recipientId && (
            <DropdownMenuItem onClick={() => setInviteOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Add to existing project
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {recipientId && (
        <InviteToProjectDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          recipientUserId={recipientId}
          recipientName={otherUser.name || 'this user'}
        />
      )}
    </div>
  );
};
