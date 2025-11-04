import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, TrendingUp, Users, DollarSign, Calendar, Eye, Heart, MessageCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

const Cre8 = () => {
  const [activeTab, setActiveTab] = useState("platform");

  // Mock data for platform challenges
  const platformChallenges = [
    {
      id: 1,
      title: "Golden Hour Cityscape",
      category: "Photography",
      description: "Capture the perfect golden hour moment in an urban setting",
      deadline: "3 days left",
      prize: "500 XP + Featured Portfolio",
      entries: 42,
      votes: 128,
      thumbnail: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400"
    },
    {
      id: 2,
      title: "Lofi Beat Challenge",
      category: "Music",
      description: "Create a 2-minute lofi beat with vinyl crackle",
      deadline: "5 days left",
      prize: "1000 XP + Spotlight",
      entries: 28,
      votes: 89,
      thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400"
    },
    {
      id: 3,
      title: "30 Second Story",
      category: "Short Film",
      description: "Tell a complete story in just 30 seconds",
      deadline: "1 week left",
      prize: "1500 XP + Career Boost",
      entries: 15,
      votes: 45,
      thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400"
    }
  ];

  // Mock data for brand challenges
  const brandChallenges = [
    {
      id: 1,
      title: "Eco Fashion Logo Design",
      brand: "GreenThreads Co.",
      category: "Design",
      description: "Design a modern logo for sustainable fashion brand",
      budget: "$500",
      deadline: "2 weeks",
      applicants: 12,
      thumbnail: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=400"
    },
    {
      id: 2,
      title: "Product Launch Video",
      brand: "TechFlow",
      category: "Video",
      description: "Create a 60-second product launch video",
      budget: "$1,200",
      deadline: "10 days",
      applicants: 8,
      thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400"
    },
    {
      id: 3,
      title: "UGC Content Series",
      brand: "FitLife",
      category: "UGC",
      description: "5-piece UGC content series for fitness app",
      budget: "$800",
      deadline: "3 weeks",
      applicants: 18,
      thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400"
    }
  ];

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
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {platformChallenges.map((challenge) => (
                  <Card key={challenge.id} className="hover-lift overflow-hidden group">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={challenge.thumbnail} 
                        alt={challenge.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur">
                        {challenge.category}
                      </Badge>
                      <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {challenge.deadline}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl">{challenge.title}</CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {challenge.entries}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {challenge.votes}
                          </div>
                        </div>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <Trophy className="h-4 w-4" />
                          {challenge.prize}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" variant="gradient">
                          Join Challenge
                        </Button>
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

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
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {brandChallenges.map((challenge) => (
                  <Card key={challenge.id} className="hover-lift overflow-hidden group">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={challenge.thumbnail} 
                        alt={challenge.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur">
                        {challenge.category}
                      </Badge>
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                        {challenge.budget}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl">{challenge.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{challenge.brand}</span>
                      </CardDescription>
                      <p className="text-sm text-muted-foreground mt-2">{challenge.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {challenge.applicants} applicants
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {challenge.deadline}
                        </div>
                      </div>
                      <Button className="w-full" variant="gradient">
                        Apply Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

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
    </>
  );
};

export default Cre8;
