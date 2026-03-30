import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones, ExternalLink, Play, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAYLIST_ID = "PL3IHAVyb_6H2OpHnvwDa7EubXaanmXfOY";

const EPISODES = [
  { id: "1", title: "Discover A Thriver – The Creative Journey", videoId: null, description: "Welcome to Discover A Thriver, the podcast for creative professionals sharing their journey in the creator economy." },
];

export const PodcastPlayer = () => {
  const [showPlaylist, setShowPlaylist] = useState(true);

  return (
    <div className="space-y-4">
      {/* Podcast Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
          <Headphones className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Discover A Thriver</h3>
          <p className="text-[11px] text-muted-foreground">Creative stories & insights • ThriveIN</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
          <a href={`https://youtube.com/playlist?list=${PLAYLIST_ID}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
            YouTube
          </a>
        </Button>
      </div>

      {/* Embedded YouTube Playlist */}
      <Card className="overflow-hidden border-border/50 rounded-xl">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}&rel=0`}
            title="Discover A Thriver Podcast"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </Card>

      {/* Coming Soon - Audio Platforms */}
      <Card className="p-4 border-dashed border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Headphones className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold">Audio platforms coming soon</p>
            <p className="text-[11px] text-muted-foreground">Spotify, Apple Podcasts & more — stay tuned!</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
