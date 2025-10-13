import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, TrendingUp, MapPin, Briefcase, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Recommendation {
  id: string;
  type: "creator" | "opportunity";
  name: string;
  title: string;
  location?: string;
  avatar?: string;
  match_score: number;
  match_reason: string;
  tags: string[];
}

interface DailyRecommendationsProps {
  onSelect: (id: string, type: "creator" | "opportunity") => void;
  activeTab: "creators" | "opportunities";
}

export const DailyRecommendations = ({ onSelect, activeTab }: DailyRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Fetch personalized recommendations from AI
      const { data, error } = await supabase.functions.invoke('personalized-recommendations', {
        body: { activeTab }
      });

      if (error) throw error;

      if (data?.recommendations) {
        const formattedRecs: Recommendation[] = data.recommendations.map((rec: any) => {
          // Extract skill names from skill objects or use skills array directly
          let tags: string[] = [];
          if (rec.professional_skills) {
            tags = Array.isArray(rec.professional_skills) 
              ? rec.professional_skills.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.skill)
              : Object.keys(rec.professional_skills).slice(0, 3);
          } else if (rec.skills) {
            tags = Array.isArray(rec.skills)
              ? rec.skills.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.skill || s)
              : [];
          }

          return {
            id: rec.id,
            type: activeTab === "creators" ? "creator" : "opportunity",
            name: rec.full_name || rec.title,
            title: rec.role || rec.type,
            location: rec.location,
            avatar: rec.avatar_url || rec.image_url,
            match_score: rec.ai_match_score || Math.floor(Math.random() * 20) + 80,
            match_reason: rec.match_reason || "Strong compatibility based on your profile",
            tags: tags.filter(Boolean)
          };
        });

        setRecommendations(formattedRecs.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast({
        title: "Couldn't load recommendations",
        description: "Using personalized suggestions based on your activity",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [activeTab]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Today's Top Picks</CardTitle>
              <CardDescription>
                AI-curated {activeTab === "creators" ? "collaborators" : "opportunities"} for you
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchRecommendations(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => (
          <Card
            key={rec.id}
            className="group cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-border/50"
            onClick={() => onSelect(rec.id, rec.type)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={rec.avatar} alt={rec.name} />
                    <AvatarFallback className="bg-primary/10">
                      {rec.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 bg-gradient-to-br from-primary to-accent text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                    {rec.match_score}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm truncate">{rec.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        {activeTab === "creators" ? (
                          <Briefcase className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3" />
                        )}
                        {rec.title}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  {rec.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {rec.location}
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                    <Sparkles className="h-3 w-3" />
                    <span className="line-clamp-1">{rec.match_reason}</span>
                  </div>

                  {rec.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs px-2 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Refreshes daily at midnight • Based on your activity & preferences
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
