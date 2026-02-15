import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Heart, X, ChevronLeft, Loader2 } from "lucide-react";

interface SwipeEntry {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  thumbnail_url: string | null;
  vote_count: number;
  user_id: string;
  profile?: { full_name: string; avatar_url: string | null };
}

interface SwipeVotingProps {
  challengeId: string;
  onBack: () => void;
}

export const SwipeVoting = ({ challengeId, onBack }: SwipeVotingProps) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SwipeEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState<"left" | "right" | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  useEffect(() => {
    loadEntries();
  }, [challengeId]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("challenge_entries")
        .select("*")
        .eq("challenge_id", challengeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load profiles + existing votes in parallel
      const [entriesWithProfiles, votesData] = await Promise.all([
        Promise.all(
          (data || []).map(async (entry) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", entry.user_id)
              .single();
            return { ...entry, profile: profile || { full_name: "Unknown", avatar_url: null } };
          })
        ),
        user
          ? supabase
              .from("challenge_votes")
              .select("entry_id")
              .eq("user_id", user.id)
              .in("entry_id", (data || []).map((e) => e.id))
          : Promise.resolve({ data: [] }),
      ]);

      setVotedIds(new Set((votesData.data || []).map((v: any) => v.entry_id)));
      // Filter out own entries and already-voted
      const filtered = entriesWithProfiles.filter(
        (e) => e.user_id !== user?.id && !new Set((votesData.data || []).map((v: any) => v.entry_id)).has(e.id)
      );
      setEntries(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (entryId: string) => {
    if (!user) return;
    try {
      await supabase.from("challenge_votes").insert({ entry_id: entryId, user_id: user.id });
      // Award XP
      try {
        const { awardXP } = await import("@/lib/xpSystem");
        await awardXP(user.id, "CHALLENGE_VOTE", "Voted via swipe");
      } catch {}
    } catch {}
  };

  const advance = (direction: "left" | "right") => {
    setSwiping(direction);
    const entry = entries[currentIndex];

    if (direction === "right" && entry) {
      handleVote(entry.id);
      toast.success("Voted! ❤️ +5 XP", { duration: 1500 });
    }

    setTimeout(() => {
      setSwiping(null);
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)`;
    }
  };

  const onTouchEnd = () => {
    const diff = currentX.current - startX.current;
    if (cardRef.current) cardRef.current.style.transform = "";
    if (Math.abs(diff) > 80) {
      advance(diff > 0 ? "right" : "left");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const entry = entries[currentIndex];
  const isFinished = currentIndex >= entries.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-bold text-lg">Swipe to Vote</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {currentIndex}/{entries.length}
        </span>
      </div>

      {isFinished ? (
        <Card className="text-center py-16">
          <Heart className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h3 className="font-bold text-xl mb-2">All caught up!</h3>
          <p className="text-muted-foreground mb-4">You've reviewed all entries</p>
          <Button onClick={onBack}>Back to Challenge</Button>
        </Card>
      ) : entry ? (
        <div className="relative">
          <div
            ref={cardRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className={`transition-all duration-300 ${
              swiping === "left"
                ? "-translate-x-full opacity-0 rotate-[-15deg]"
                : swiping === "right"
                ? "translate-x-full opacity-0 rotate-[15deg]"
                : ""
            }`}
          >
            <Card className="overflow-hidden">
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={entry.thumbnail_url || entry.media_url}
                  alt={entry.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-3">
                <h4 className="font-bold text-lg">{entry.title}</h4>
                {entry.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={entry.profile?.avatar_url || undefined} />
                    <AvatarFallback>{entry.profile?.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{entry.profile?.full_name}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {entry.vote_count} votes
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-center gap-8 mt-6">
            <Button
              size="lg"
              variant="outline"
              className="h-16 w-16 rounded-full border-2 border-destructive text-destructive"
              onClick={() => advance("left")}
            >
              <X className="h-7 w-7" />
            </Button>
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-primary"
              onClick={() => advance("right")}
            >
              <Heart className="h-7 w-7" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Swipe right to vote, left to skip
          </p>
        </div>
      ) : null}
    </div>
  );
};
