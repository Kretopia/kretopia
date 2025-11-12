import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, Image as ImageIcon, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "profile" | "opportunity" | "portfolio";
  title: string;
  description: string;
  timestamp: string;
  avatar?: string;
  badge?: string;
}

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Set timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        // Fetch all data in parallel for faster loading
        const dataPromise = Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, role, created_at")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("opportunities")
            .select("id, title, type, created_at")
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("portfolio_items")
            .select("id, title, user_id, created_at, profiles(full_name, avatar_url)")
            .order("created_at", { ascending: false })
            .limit(3)
        ]);

        const [
          { data: profiles },
          { data: opportunities },
          { data: portfolio }
        ] = await Promise.race([dataPromise, timeoutPromise]) as any;

        const allActivities: ActivityItem[] = [];

        // Add profiles
        profiles?.forEach((profile) => {
          allActivities.push({
            id: `profile-${profile.user_id}`,
            type: "profile",
            title: profile.full_name || "New Creator",
            description: `${profile.role || "Creator"} joined the platform`,
            timestamp: profile.created_at,
            avatar: profile.avatar_url,
            badge: "new",
          });
        });

        // Add opportunities
        opportunities?.forEach((opp) => {
          allActivities.push({
            id: `opp-${opp.id}`,
            type: "opportunity",
            title: opp.title,
            description: `New ${opp.type} opportunity posted`,
            timestamp: opp.created_at,
            badge: opp.type,
          });
        });

        // Add portfolio items
        portfolio?.forEach((item) => {
          allActivities.push({
            id: `portfolio-${item.id}`,
            type: "portfolio",
            title: item.title,
            description: `${item.profiles?.full_name || "A creator"} shared new work`,
            timestamp: item.created_at,
            avatar: item.profiles?.avatar_url,
          });
        });

        // Sort by timestamp and take top 8
        allActivities.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setActivities(allActivities.slice(0, 8));
      } catch (error) {
        console.error("Error fetching activities:", error);
        // Show empty state on error instead of infinite loading
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "profile":
        return <User className="h-4 w-4" />;
      case "opportunity":
        return <Briefcase className="h-4 w-4" />;
      case "portfolio":
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <Card
          key={activity.id}
          className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              {activity.avatar ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.avatar} />
                  <AvatarFallback>{activity.title[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {getIcon(activity.type)}
                </div>
              )}
              {activity.badge === "new" && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.description}
                  </p>
                </div>
                {activity.badge && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {activity.badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
