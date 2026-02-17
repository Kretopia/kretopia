import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy, DollarSign, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChallengeDetailDialog } from "@/components/cre8/ChallengeDetailDialog";
import { ChallengeCard } from "@/components/cre8/ChallengeCard";
import { CadenceTabs } from "@/components/cre8/CadenceTabs";
import { LeaderboardPreview } from "@/components/cre8/LeaderboardPreview";
import { MyActiveEntries } from "@/components/cre8/MyActiveEntries";
import { PastWinners } from "@/components/cre8/PastWinners";
import { PastChallenges } from "@/components/cre8/PastChallenges";
import { FlashChallengesBanner } from "@/components/cre8/FlashChallengesBanner";
import { ArenaRankProgress } from "@/components/cre8/ArenaRankProgress";
import { RecentAchievements } from "@/components/cre8/AchievementBadges";
import { useToast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  cadence: string;
  deadline: string;
  prize_description: string | null;
  prize_amount: number | null;
  budget: string | null;
  thumbnail_url: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
  xp_reward: number;
  is_flash: boolean;
  entries?: { count: number }[];
}

const Cre8 = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("platform");
  const [cadence, setCadence] = useState("all");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [myRankData, setMyRankData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  // Auto-check and generate challenges on mount
  useEffect(() => {
    const autoRotate = async () => {
      try {
        // Check if there are expired challenges or missing cadences
        const { data: active } = await supabase
          .from("challenges")
          .select("cadence, is_flash")
          .eq("status", "active")
          .eq("type", "platform");

        const counts: Record<string, number> = { daily: 0, "48hr": 0, weekly: 0, flash: 0 };
        for (const c of active || []) {
          if (c.is_flash) counts.flash++;
          else counts[c.cadence] = (counts[c.cadence] || 0) + 1;
        }

        // Check for expired
        const { data: expired } = await supabase
          .from("challenges")
          .select("id")
          .eq("status", "active")
          .lt("deadline", new Date().toISOString())
          .limit(1);

        const needsGeneration =
          (expired && expired.length > 0) ||
          counts.daily < 1 ||
          counts["48hr"] < 1 ||
          counts.weekly < 1;

        if (needsGeneration) {
          setGenerating(true);
          await supabase.functions.invoke("generate-challenges");
          setGenerating(false);
        }
      } catch (err) {
        console.error("Auto-rotate error:", err);
        setGenerating(false);
      }
    };
    autoRotate();
  }, []);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("challenges")
        .select("*, entries:challenge_entries(count)")
        .eq("type", mainTab)
        .eq("status", "active")
        .order("deadline", { ascending: true });

      if (cadence === "flash") {
        query = query.eq("is_flash", true);
      } else if (cadence !== "all") {
        query = query.eq("cadence", cadence).eq("is_flash", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Load challenges error:", error);
    } finally {
      setLoading(false);
    }
  }, [mainTab, cadence]);

  const loadMyRank = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("challenge_leaderboard")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setMyRankData(data);
    } catch (err) {
      console.error("Rank load error:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!generating) loadChallenges();
  }, [loadChallenges, generating]);

  useEffect(() => {
    loadMyRank();
  }, [loadMyRank]);

  const getDaysLeft = (deadline: string) =>
    Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <SEO
        title="Cre8 Arena - Creative Challenges & Competitions"
        description="Daily, 48hr, weekly, and flash creative challenges. Win XP, climb the leaderboard, and get discovered."
      />

      <div className="min-h-screen pb-28 sm:pb-24 md:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold">Cre8 Arena</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create. Compete. Conquer.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-4 space-y-5 max-w-4xl">
          {/* My Arena Rank (logged in users) */}
          {user && myRankData && (
            <ArenaRankProgress
              rank={myRankData.arena_rank || "rookie"}
              totalWins={myRankData.total_wins || 0}
              totalEntries={myRankData.total_entries || 0}
              top10Finishes={myRankData.top_10_finishes || 0}
              allStarFinishes={myRankData.all_star_finishes || 0}
              currentStreak={myRankData.current_streak || 0}
              totalVotes={myRankData.total_votes_received || 0}
              totalXP={myRankData.total_challenge_xp || 0}
            />
          )}

          {/* Flash Challenges Banner */}
          <FlashChallengesBanner onSelect={setSelectedChallengeId} />

          {/* Main Tabs: Platform vs Brand */}
          <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v); setCadence("all"); }}>
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="platform" className="gap-1.5 text-sm">
                <Trophy className="h-4 w-4" />
                Challenges
              </TabsTrigger>
              <TabsTrigger value="brand" className="gap-1.5 text-sm">
                <DollarSign className="h-4 w-4" />
                Brand Challenges
              </TabsTrigger>
            </TabsList>

            <TabsContent value="platform" className="space-y-5 mt-4">
              {/* Cadence Filter (now includes Flash) */}
              <CadenceTabs active={cadence} onChange={setCadence} />

              {/* Challenge Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : challenges.length === 0 ? (
                <Card className="text-center py-10">
                  <CardContent>
                    <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                    <h3 className="font-bold text-lg mb-1">No Active Challenges</h3>
                    <p className="text-sm text-muted-foreground">
                      {cadence !== "all"
                        ? `No ${cadence} challenges right now. Try another cadence!`
                        : "Check back soon for new creative challenges!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {challenges.map((challenge) => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      entryCount={challenge.entries?.[0]?.count || 0}
                      daysLeft={getDaysLeft(challenge.deadline)}
                      onClick={() => setSelectedChallengeId(challenge.id)}
                    />
                  ))}
                </div>
              )}

              {/* Leaderboard + Achievements side by side on larger screens */}
              <div className="grid gap-4 md:grid-cols-2">
                <LeaderboardPreview />
                <RecentAchievements />
              </div>

              {/* My Active Entries */}
              <MyActiveEntries onChallengeClick={setSelectedChallengeId} />

              {/* Past Challenges (replaces old PastWinners) */}
              <PastChallenges onChallengeClick={setSelectedChallengeId} />
            </TabsContent>

            <TabsContent value="brand" className="space-y-5 mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : challenges.length === 0 ? (
                <Card className="text-center py-10">
                  <CardContent>
                    <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                    <h3 className="font-bold text-lg mb-1">No Brand Challenges Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Brand-sponsored challenges are coming soon!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {challenges.map((challenge) => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      entryCount={challenge.entries?.[0]?.count || 0}
                      daysLeft={getDaysLeft(challenge.deadline)}
                      onClick={() => setSelectedChallengeId(challenge.id)}
                    />
                  ))}
                </div>
              )}

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6 text-center space-y-3">
                  <h3 className="font-bold text-lg">Want to Post a Brand Challenge?</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with talented creators for your next project
                  </p>
                  <Button variant="default">Post a Challenge</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ChallengeDetailDialog
        open={!!selectedChallengeId}
        onOpenChange={(open) => !open && setSelectedChallengeId(null)}
        challengeId={selectedChallengeId || ""}
      />
    </>
  );
};

export default Cre8;
