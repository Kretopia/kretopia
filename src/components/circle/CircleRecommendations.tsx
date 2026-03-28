import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendedCircle {
  id: string;
  title: string;
  icon_emoji: string;
  member_count: number;
  category: string;
  description: string | null;
  reason: string;
}

export const CircleRecommendations = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendedCircle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    generateRecommendations();
  }, [user]);

  const generateRecommendations = async () => {
    try {
      // Get user profile for skills/interests
      const [profileRes, membershipsRes, allCirclesRes] = await Promise.all([
        supabase.from("profiles").select("professional_skills, passion_skills, role, location").eq("user_id", user!.id).single(),
        supabase.from("spark_room_members").select("room_id").eq("user_id", user!.id),
        supabase.from("spark_rooms").select("id, title, icon_emoji, member_count, category, description").eq("is_active", true).order("member_count", { ascending: false }).limit(50),
      ]);

      const joinedIds = new Set(membershipsRes.data?.map(m => m.room_id) || []);
      const notJoined = allCirclesRes.data?.filter(c => !joinedIds.has(c.id)) || [];
      const profile = profileRes.data;

      const rawSkills = [
        ...(Array.isArray(profile?.professional_skills) ? profile.professional_skills : Object.keys(profile?.professional_skills || {})),
        ...(Array.isArray(profile?.passion_skills) ? profile.passion_skills : Object.keys(profile?.passion_skills || {})),
      ];
      const userSkills = rawSkills.map(s => String(s).toLowerCase());

      const userRole = profile?.role?.toLowerCase() || "";

      // Score each circle
      const scored = notJoined.map(circle => {
        let score = 0;
        let reason = "Popular in community";
        const desc = (circle.description || "").toLowerCase();
        const title = circle.title.toLowerCase();
        const cat = circle.category?.toLowerCase() || "";

        // Skill match
        const matchedSkills = userSkills.filter(s => desc.includes(s) || title.includes(s) || cat.includes(s));
        if (matchedSkills.length > 0) {
          score += matchedSkills.length * 15;
          reason = `Matches your skills: ${matchedSkills.slice(0, 2).join(", ")}`;
        }

        // Role match
        if (userRole && (desc.includes(userRole) || title.includes(userRole) || cat.includes(userRole))) {
          score += 20;
          reason = `Great for ${profile?.role || "your role"}`;
        }

        // Popularity boost
        score += Math.min(circle.member_count, 50);

        return { ...circle, score, reason };
      });

      scored.sort((a, b) => b.score - a.score);
      setRecommendations(scored.slice(0, 4));
    } catch (err) {
      console.error("Error generating recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("py-3", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">For You</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-48 h-24 rounded-xl bg-muted animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className={cn("py-1", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended For You</p>
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {recommendations.map(circle => (
          <button
            key={circle.id}
            onClick={() => navigate(`/circle/${circle.id}`)}
            className="w-48 shrink-0 rounded-xl border border-border/50 bg-card p-3 text-left hover:bg-accent/5 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{circle.icon_emoji}</span>
              <h4 className="text-xs font-semibold truncate flex-1">{circle.title}</h4>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{circle.reason}</p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{circle.member_count} members</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
