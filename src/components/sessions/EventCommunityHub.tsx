import { Users2 } from "lucide-react";
import { EventGuestRoster } from "./EventGuestRoster";
import { EventGroupChatCard } from "./EventGroupChatCard";
import { EventInlineChat } from "./EventInlineChat";
import { EventComments } from "./EventComments";
import { ContinueAsCircle } from "./ContinueAsCircle";

interface Props {
  eventId: string;
  eventTitle: string;
  eventCategory?: string;
  eventCoverImageUrl?: string;
  hostId: string;
  isCreator: boolean;
  isAuthenticated: boolean;
  currentUserId: string | null;
  isParticipant: boolean;
  participantCount: number;
  guestMatchingEnabled: boolean;
  isPast: boolean;
  isCompleted: boolean;
  groupChatEnabled: boolean;
  groupChatRoomId: string | null;
  onGroupChatChange: (next: { enabled: boolean; roomId: string | null }) => void;
  circleId?: string | null;
  onCircleLinked: () => void;
}

/**
 * Component 2 — the crew. Who's going, the group chat, the event chat and
 * the comment thread all live under one shell so the page reads as one
 * social surface instead of four stacked cards. Once the event has
 * happened, this is also where the "continue as a Circle" bridge appears
 * (CEO rule: the event turns into a standing group afterward).
 */
export function EventCommunityHub({
  eventId, eventTitle, eventCategory, eventCoverImageUrl, hostId,
  isCreator, isAuthenticated, currentUserId, isParticipant, participantCount,
  guestMatchingEnabled, isPast, isCompleted, groupChatEnabled, groupChatRoomId, onGroupChatChange,
  circleId, onCircleLinked,
}: Props) {
  return (
    <section className="relative mb-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-[28px] blur-xl opacity-40 ai-ambient-breathe"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, hsl(var(--energy) / 0.15), transparent 70%)" }}
      />
      <div className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-3 sm:p-4 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users2 className="h-4 w-4 text-energy" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">The crew</p>
        </div>

        {guestMatchingEnabled && (
          <EventGuestRoster
            eventId={eventId}
            eventTitle={eventTitle}
            hostId={hostId}
            currentUserId={currentUserId}
            isParticipant={isParticipant}
            isHost={isCreator}
            participantCount={participantCount}
          />
        )}

        {isAuthenticated && (
          <EventGroupChatCard
            eventId={eventId}
            eventTitle={eventTitle}
            isHost={isCreator}
            isParticipant={isParticipant}
            hostId={hostId}
            groupChatEnabled={groupChatEnabled}
            groupChatRoomId={groupChatRoomId}
            onChange={onGroupChatChange}
          />
        )}

        {isAuthenticated && groupChatEnabled && groupChatRoomId && currentUserId && (isCreator || isParticipant) && (
          <EventInlineChat
            roomId={groupChatRoomId}
            currentUserId={currentUserId}
            archived={isPast || isCompleted}
          />
        )}

        <EventComments
          eventId={eventId}
          isCreator={isCreator}
          creatorId={hostId}
          eventTitle={eventTitle}
          isParticipant={isParticipant}
        />

        {isPast && (
          <ContinueAsCircle
            eventId={eventId}
            eventTitle={eventTitle}
            isCreator={isCreator}
            circleId={circleId}
            category={eventCategory}
            coverImageUrl={eventCoverImageUrl}
            onLinked={onCircleLinked}
          />
        )}
      </div>
    </section>
  );
}

export default EventCommunityHub;
