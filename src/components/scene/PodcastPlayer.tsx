import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Headphones, ExternalLink, Play, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const PLAYLIST_ID = "PL3IHAVyb_6H2OpHnvwDa7EubXaanmXfOY";

interface Episode {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export const PodcastPlayer = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEpisode, setActiveEpisode] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-youtube-playlist", {
          body: { playlistId: PLAYLIST_ID },
        });
        if (error) throw error;
        if (data?.episodes?.length) {
          setEpisodes(data.episodes);
          setActiveEpisode(data.episodes[0].videoId);
        }
      } catch (e) {
        console.error("Failed to fetch episodes:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchEpisodes();
  }, []);

  const visibleEpisodes = showAll ? episodes : episodes.slice(0, 4);
  const activeEp = episodes.find(e => e.videoId === activeEpisode);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
          <Headphones className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Discover A Thriver</h3>
          <p className="text-[11px] text-muted-foreground">
            Inspiration, features & stories about Thrivers • {episodes.length} episodes
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
          <a href={`https://youtube.com/playlist?list=${PLAYLIST_ID}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
            YouTube
          </a>
        </Button>
      </div>

      {/* Active Player */}
      {activeEpisode && (
        <Card className="overflow-hidden border-border/50 rounded-xl">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${activeEpisode}?rel=0`}
              title={activeEp?.title || "Discover A Thriver"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
          {activeEp && (
            <div className="p-3 border-t border-border/50">
              <h4 className="text-xs font-semibold line-clamp-1">{activeEp.title}</h4>
              {activeEp.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{activeEp.description}</p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Episode List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            All Episodes
          </p>
          {visibleEpisodes.map((ep) => (
            <Card
              key={ep.videoId}
              onClick={() => setActiveEpisode(ep.videoId)}
              className={cn(
                "flex gap-3 p-2.5 cursor-pointer transition-all rounded-xl border",
                activeEpisode === ep.videoId
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/50 hover:border-primary/20"
              )}
            >
              <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0">
                <img
                  src={ep.thumbnail}
                  alt={ep.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {activeEpisode !== ep.videoId && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <h4 className="text-xs font-semibold line-clamp-2 leading-tight">{ep.title}</h4>
                {ep.publishedAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(ep.publishedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </Card>
          ))}

          {episodes.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showAll ? "Show less" : `Show all ${episodes.length} episodes`}
            </Button>
          )}
        </div>
      )}

      {/* Audio Platforms */}
      <Card className="p-3.5 border-dashed border-border/50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold">Audio platforms coming soon</p>
            <p className="text-[10px] text-muted-foreground">Spotify, Apple Podcasts & more</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
