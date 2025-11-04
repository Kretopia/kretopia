import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, TrendingUp, Users, DollarSign, Calendar, Eye, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeDetailDialog } from "@/components/cre8/ChallengeDetailDialog";
import { formatDistanceToNow } from "date-fns";

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
  entries?: { count: number }[];
  votes?: { count: number }[];
}

const Cre8 = () => {
  const [activeTab, setActiveTab] = useState("platform");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, [activeTab]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('type', activeTab)
        .eq('status', 'active')
        .order('deadline', { ascending: true });

      if (error) throw error;

      // Get counts for each challenge
      const challengesWithCounts = await Promise.all(
        (data || []).map(async (challenge) => {
          const { count: entryCount } = await supabase
            .from('challenge_entries')
            .select('*', { count: 'exact', head: true })
            .eq('challenge_id', challenge.id);

          const { count: voteCount } = await supabase
            .from('challenge_votes')
            .select('*', { count: 'exact', head: true })
            .in('entry_id', 
              (await supabase
                .from('challenge_entries')
                .select('id')
                .eq('challenge_id', challenge.id)).data?.map(e => e.id) || []
            );

          return {
            ...challenge,
            entries: [{ count: entryCount || 0 }],
            votes: [{ count: voteCount || 0 }]
          };
        })
      );

      setChallenges(challengesWithCounts);
    } catch (error) {
      console.error('Load challenges error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = (deadline: string) => {
    const days = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const renderChallenges = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (challenges.length === 0) {
      return (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Active Challenges</h3>
            <p className="text-muted-foreground">
              Check back soon for new creative challenges!
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{challenges.map((challenge) => {
          const daysLeft = getDaysLeft(challenge.deadline);
          const entryCount = challenge.entries?.[0]?.count || 0;
          const voteCount = challenge.votes?.[0]?.count || 0;

          return (
            <Card key={challenge.id} className="hover-lift overflow-hidden group cursor-pointer" onClick={() => setSelectedChallengeId(challenge.id)}>
              <div className="relative h-48 overflow-hidden">
                <img
                  src={challenge.thumbnail_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400"}
                  alt={challenge.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur">
                  {challenge.category}
                </Badge>
                <div className={`absolute bottom-3 right-3 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${
                  daysLeft <= 3 ? 'bg-destructive/90 text-destructive-foreground' : 'bg-background/90'
                }`}>
                  <Calendar className="h-3 w-3" />
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
                </div>
              </div>
              <CardHeader>
                {challenge.brand_name && (
                  <div className="flex items-center gap-2 mb-2">
                    {challenge.brand_logo_url && (
                      <img src={challenge.brand_logo_url} alt={challenge.brand_name} className="h-6 w-6 rounded" />
                    )}
                    <span className="text-sm font-semibold">{challenge.brand_name}</span>
                  </div>
                )}
                <CardTitle className="text-xl">{challenge.title}</CardTitle>
                <CardDescription className="line-clamp-2">{challenge.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {entryCount}
                    </div>
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Trophy className="h-4 w-4" />
                    {challenge.prize_description || challenge.budget}
                  </div>
                </div>
                <Button className="w-full" variant="gradient">
                  View Challenge
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <SEO 
        title="Cre8 Challenge - Creative Competitions & Paid Gigs"
        description="Join weekly creative challenges, win prizes, and get discovered. Apply for brand-sponsored challenges and get paid for your creativity."
      />
      
      <div className="min-h-screen bg-gradient-accent pb-6">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Flame className="h-5 w-5" />
              <span className="font-semibold">Create. Compete. Conquer.</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
              Cre8 Challenge
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Push your creative boundaries with weekly challenges or get paid for brand collaborations
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="platform" className="gap-2">
                <Trophy className="h-4 w-4" />
                Platform Challenges
              </TabsTrigger>
              <TabsTrigger value="brand" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Brand Challenges
              </TabsTrigger>
            </TabsList>

            {/* Platform Challenges Tab */}
            <TabsContent value="platform" className="space-y-6">
              {renderChallenges()}

              <Card className="bg-gradient-primary text-primary-foreground border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    How Platform Challenges Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-primary-foreground/90">
                  <p>✨ <strong>Free Entry:</strong> All platform challenges are free to join</p>
                  <p>🎯 <strong>Submit Your Work:</strong> Upload your creative entry before the deadline</p>
                  <p>🗳️ <strong>Community Voting:</strong> Members vote for their favorite entries</p>
                  <p>🏆 <strong>Win Prizes:</strong> Top entries win XP, featured portfolios, and career boosts</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Brand Challenges Tab */}
            <TabsContent value="brand" className="space-y-6">
              {renderChallenges()}

              <Card className="bg-accent/5 border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <DollarSign className="h-5 w-5" />
                    How Brand Challenges Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <p>💼 <strong>Brand Posts Challenge:</strong> Companies post paid creative challenges</p>
                  <p>📤 <strong>Submit Proposal:</strong> Apply with your portfolio and approach</p>
                  <p>🎨 <strong>Get Selected:</strong> Brand picks the best creator for the job</p>
                  <p>💰 <strong>Get Paid:</strong> Complete work and receive payment through ThrivePay escrow</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-bold">Want to Post a Brand Challenge?</h3>
                    <p className="text-muted-foreground">
                      Connect with talented creators for your next project
                    </p>
                    <Button variant="gradient" size="lg">
                      Post a Challenge
                    </Button>
                  </div>
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
