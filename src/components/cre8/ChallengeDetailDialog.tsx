import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar, Trophy, Users, Upload, Loader2, Sparkles } from "lucide-react";
import { SubmitEntryDialog } from "./SubmitEntryDialog";
import { ChallengeEntryCard } from "./ChallengeEntryCard";
import { SwipeVoting } from "./SwipeVoting";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  deadline: string;
  prize_description: string | null;
  prize_amount: number | null;
  budget: string | null;
  thumbnail_url: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
}

interface Entry {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: string;
  thumbnail_url: string | null;
  vote_count: number;
  user_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ChallengeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
}

export const ChallengeDetailDialog = ({ open, onOpenChange, challengeId }: ChallengeDetailDialogProps) => {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [swipeMode, setSwipeMode] = useState(false);

  const loadChallengeData = async () => {
    if (!challengeId) return;

    setLoading(true);
    try {
      // Load challenge
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeError) throw challengeError;
      setChallenge(challengeData);

      // Load entries with user profiles
      const { data: entriesData, error: entriesError } = await supabase
        .from('challenge_entries')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('vote_count', { ascending: false });

      if (entriesError) throw entriesError;

      // Get profiles for entries
      const entriesWithProfiles = await Promise.all(
        (entriesData || []).map(async (entry) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', entry.user_id)
            .single();

          return {
            ...entry,
            profiles: profile || { full_name: 'Unknown User', avatar_url: null }
          };
        })
      );

      setEntries(entriesWithProfiles);
      
      // Check if user has submitted
      if (user) {
        const hasEntry = entriesWithProfiles.some(entry => entry.user_id === user.id);
        setHasSubmitted(!!hasEntry);

        // Load user's votes
        const { data: votesData } = await supabase
          .from('challenge_votes')
          .select('entry_id')
          .eq('user_id', user.id)
          .in('entry_id', entriesWithProfiles.map(e => e.id));

        setMyVotes(new Set(votesData?.map(v => v.entry_id) || []));
      }
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error("Failed to load challenge details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && challengeId) {
      loadChallengeData();
    }
  }, [open, challengeId, user]);

  const handleVote = async (entryId: string) => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }

    const hasVoted = myVotes.has(entryId);

    try {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('challenge_votes')
          .delete()
          .eq('entry_id', entryId)
          .eq('user_id', user.id);

        if (error) throw error;

        setMyVotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(entryId);
          return newSet;
        });

        setEntries(prev => prev.map(entry =>
          entry.id === entryId
            ? { ...entry, vote_count: entry.vote_count - 1 }
            : entry
        ));
      } else {
        // Add vote
        const { error } = await supabase
          .from('challenge_votes')
          .insert({
            entry_id: entryId,
            user_id: user.id,
          });

        if (error) throw error;

        setMyVotes(prev => new Set(prev).add(entryId));

        setEntries(prev => prev.map(entry =>
          entry.id === entryId
            ? { ...entry, vote_count: entry.vote_count + 1 }
            : entry
        ));

        // Award XP for voting (fire and forget)
        try {
          const { awardXP } = await import("@/lib/xpSystem");
          await awardXP(user.id, 'CHALLENGE_VOTE', 'Voted on a challenge entry');
        } catch (xpError) {
          console.error('XP award error:', xpError);
        }
      }
    } catch (error: any) {
      console.error('Vote error:', error);
      toast.error("Failed to update vote");
    }
  };

  if (loading || !challenge) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(challenge.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Challenge Header */}
          <div className="space-y-4">
            {challenge.thumbnail_url && (
              <img
                src={challenge.thumbnail_url}
                alt={challenge.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{challenge.category}</Badge>
                  <Badge variant={challenge.type === 'brand' ? 'default' : 'secondary'}>
                    {challenge.type === 'brand' ? 'Brand Challenge' : 'Platform Challenge'}
                  </Badge>
                </div>
                <h2 className="text-3xl font-bold mb-2">{challenge.title}</h2>
                {challenge.brand_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {challenge.brand_logo_url && (
                      <img src={challenge.brand_logo_url} alt={challenge.brand_name} className="h-6 w-6 rounded" />
                    )}
                    <span className="font-semibold">{challenge.brand_name}</span>
                  </div>
                )}
              </div>

              {!hasSubmitted && daysLeft > 0 && (
                <Button onClick={() => setSubmitDialogOpen(true)} size="lg">
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Entry
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={daysLeft <= 3 ? 'text-destructive font-semibold' : ''}>
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span>{challenge.prize_description || challenge.budget}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{entries.length} entries</span>
              </div>
            </div>

            <p className="text-muted-foreground">{challenge.description}</p>
          </div>

          {/* Entries Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Entries ({entries.length})</h3>
              {entries.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSwipeMode(!swipeMode)}
                  className="gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  {swipeMode ? "Grid View" : "Swipe Vote"}
                </Button>
              )}
            </div>

            {swipeMode ? (
              <SwipeVoting
                challengeId={challengeId}
                onBack={() => setSwipeMode(false)}
              />
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No entries yet. Be the first to submit!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entries.map((entry) => (
                  <ChallengeEntryCard
                    key={entry.id}
                    entry={entry}
                    hasVoted={myVotes.has(entry.id)}
                    onVote={() => handleVote(entry.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SubmitEntryDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        challengeId={challengeId}
        onSuccess={loadChallengeData}
      />
    </>
  );
};
