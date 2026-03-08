import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ShowcaseItem {
  id: string;
  title: string;
  thumbnail_url: string;
  media_type: string;
}

const RELIABLE_HOSTS = [
  "img.youtube.com",
  "i.ytimg.com",
  "i.scdn.co",
  "kwmcocsitwssrtzkdojh.supabase.co",
];

function isReliableThumbnail(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return RELIABLE_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}

export const PortfolioShowcase = () => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const { data } = await supabase
        .from("portfolio_items")
        .select("id, title, media_url, thumbnail_url, media_type")
        .not("media_url", "is", null)
        .not("thumbnail_url", "is", null)
        .neq("thumbnail_url", "")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const mapped: ShowcaseItem[] = data
        .filter((d) => {
          const thumb = d.thumbnail_url!;
          if (thumb.endsWith(".wav") || thumb.endsWith(".mp3")) return false;
          return isReliableThumbnail(thumb);
        })
        .map((d) => ({
          id: d.id,
          title: d.title || "Untitled",
          thumbnail_url: d.thumbnail_url!,
          media_type: d.media_type || "image",
        }));

      // Shuffle so items are mixed
      const shuffled = [...mapped].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      setLoading(false);
    };

    fetchPortfolio();
  }, []);

  if (loading || items.length < 2) return null;

  // Duplicate for seamless infinite scroll (exactly 2x for -50% translateX)
  const scrollItems = [...items, ...items];

  return (
    <section className="py-16 sm:py-20 overflow-hidden">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 mb-10 text-center">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-3">
          Real work. Real creators.
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          See what's being built on{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            thriveIN
          </span>
        </h2>
        <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
          From demo reels to brand designs — browse portfolios from creators
          already on the platform.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 animate-scroll-x hover:[animation-play-state:paused]">
          {scrollItems.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="flex-shrink-0 w-64 sm:w-72 group"
            >
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/50 bg-muted/30 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    // Hide the card without re-rendering (no state update)
                    const card = (e.target as HTMLElement).closest('.group');
                    if (card) (card as HTMLElement).style.display = 'none';
                  }}
                />
                {item.media_type === "video" && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Video
                  </div>
                )}
                {item.media_type === "audio" && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Audio
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm font-medium truncate text-muted-foreground px-1">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-10">
        <Link to="/auth">
          <Button variant="outline" size="lg" className="group">
            Join & showcase your work
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </section>
  );
};
