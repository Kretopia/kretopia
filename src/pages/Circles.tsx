import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MessageSquareMore, TrendingUp, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CirclesTab } from "@/components/scene/CirclesTab";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CirclesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [trendingCircles, setTrendingCircles] = useState<any[]>([]);

  // Fetch trending circles for the discovery banner
  useEffect(() => {
    const fetchTrending = async () => {
      const { data } = await supabase
        .from("spark_rooms")
        .select("id, title, icon_emoji, member_count, category")
        .eq("is_active", true)
        .order("member_count", { ascending: false })
        .limit(5);
      setTrendingCircles(data || []);
    };
    fetchTrending();
  }, []);

  return (
    <>
      <Helmet>
        <title>Circles | ThriveIN</title>
        <meta name="description" content="Join community spaces, discuss ideas, and grow with fellow creatives on ThriveIN." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquareMore className="h-5 w-5 text-primary" />
                  Circles
                </h1>
                <p className="text-sm text-muted-foreground">Community spaces for creatives</p>
              </div>
            </div>
          </div>

          {/* Trending Banner */}
          {trendingCircles.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trending</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {trendingCircles.map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/circle/${c.id}`)}
                    className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-3 py-1.5 shrink-0 hover:bg-accent/10 transition-colors"
                  >
                    <span className="text-sm">{c.icon_emoji}</span>
                    <span className="text-xs font-medium truncate max-w-[100px]">{c.title}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{c.member_count}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Circles List */}
          <CirclesTab />
        </div>
      </div>
    </>
  );
};

export default CirclesPage;
