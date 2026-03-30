import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Headphones, Play, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  embed_url: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  episode_number: number | null;
  season_number: number;
  guest_name: string | null;
  guest_role: string | null;
  published_at: string;
}

export const PodcastPlayer = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("podcast_episodes")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(20);
      setEpisodes((data as Episode[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Headphones className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-semibold mb-1">Discover A Thriver</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Our podcast featuring creative entrepreneurs sharing their journey. Episodes coming soon!
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href="https://www.youtube.com/@thrivein" target="_blank" rel="noopener noreferrer" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Watch on YouTube
          </a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Podcast Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
          <Headphones className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Discover A Thriver</h3>
          <p className="text-[11px] text-muted-foreground">Creative stories & insights • ThriveIN</p>
        </div>
      </div>

      {/* Episodes List */}
      <div className="space-y-2">
        {episodes.map(ep => {
          const isExpanded = expandedId === ep.id;
          return (
            <Card
              key={ep.id}
              className={cn(
                "overflow-hidden transition-all border-border/50",
                isExpanded && "border-primary/30"
              )}
            >
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpandedId(isExpanded ? null : ep.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {ep.cover_image_url ? (
                    <img src={ep.cover_image_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <Play className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{ep.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    {ep.episode_number && <span>EP {ep.episode_number}</span>}
                    {ep.guest_name && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        ft. {ep.guest_name}
                      </Badge>
                    )}
                    {ep.duration_seconds && <span>{formatDuration(ep.duration_seconds)}</span>}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {ep.description && (
                    <p className="text-xs text-muted-foreground">{ep.description}</p>
                  )}
                  {ep.embed_url && (
                    <div className="rounded-lg overflow-hidden">
                      <iframe
                        src={ep.embed_url}
                        width="100%"
                        height="152"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="border-0 rounded-lg"
                      />
                    </div>
                  )}
                  {ep.audio_url && !ep.embed_url && (
                    <audio controls className="w-full h-10" preload="none">
                      <source src={ep.audio_url} />
                    </audio>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
