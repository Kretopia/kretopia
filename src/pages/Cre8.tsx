import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy, DollarSign, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeDetailDialog } from "@/components/cre8/ChallengeDetailDialog";
import { ChallengeCard } from "@/components/cre8/ChallengeCard";
import { CadenceTabs } from "@/components/cre8/CadenceTabs";
import { LeaderboardPreview } from "@/components/cre8/LeaderboardPreview";
import { MyActiveEntries } from "@/components/cre8/MyActiveEntries";
import { PastWinners } from "@/components/cre8/PastWinners";

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
  entries?: { count: number }[];
}

const Cre8 = () => {
  const [mainTab, setMainTab] = useState("platform");
  const [cadence, setCadence] = useState("all");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("challenges")
        .select("*, entries:challenge_entries(count)")
        .eq("type", mainTab)
        .eq("status", "active")
        .order("deadline", { ascending: true });

      if (cadence !== "all") {
        query = query.eq("cadence", cadence);
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

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const getDaysLeft = (deadline: string) =>
    Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <SEO
        title="Cre8 Arena - Creative Challenges & Competitions"
        description="Daily, 48hr, and weekly creative challenges. Win XP, climb the leaderboard, and get discovered."
      />

      <div className="min-h-screen pb-28 sm:pb-24 md:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold">Cre8 Arena</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create. Compete. Conquer.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-4 space-y-5 max-w-4xl">
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
              {/* Cadence Filter */}
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

              {/* Leaderboard Preview */}
              <LeaderboardPreview />

              {/* My Active Entries */}
              <MyActiveEntries onChallengeClick={setSelectedChallengeId} />

              {/* Past Winners */}
              <PastWinners />
            </TabsContent>

            <TabsContent value="brand" className="space-y-5 mt-4">
              {/* Brand challenges share the same loading / grid logic */}
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
