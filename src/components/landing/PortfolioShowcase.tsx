import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ShowcaseItem {
  id: string;
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  media_type: string;
  creator_name: string;
  creator_role: string;
  creator_avatar: string | null;
}

export const PortfolioShowcase = () => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const { data } = await supabase
        .from("portfolio_items")
        .select("id, title, media_url, thumbnail_url, media_type, user_id")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, role, avatar_url, is_claimed")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || [])
          .filter((p) => p.is_claimed !== false)
          .map((p) => [p.user_id, p])
      );

      const mapped: ShowcaseItem[] = data
        .filter((d) => profileMap.has(d.user_id))
        .map((d) => {
          const p = profileMap.get(d.user_id)!;
          return {
            id: d.id,
            title: d.title || "Untitled",
            media_url: d.media_url!,
            thumbnail_url: d.thumbnail_url,
            media_type: d.media_type || "image",
            creator_name: p.full_name || "Creator",
            creator_role: p.role || "",
            creator_avatar: p.avatar_url,
          };
        });

      // Shuffle so consecutive items aren't from the same creator
      const shuffled = [...mapped].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      setLoading(false);
    };

    fetchPortfolio();
  }, []);

  if (loading || items.length < 2) return null;

  // Duplicate enough for seamless infinite scroll
  const repeatCount = Math.max(3, Math.ceil(12 / items.length));
  const scrollItems = Array.from({ length: repeatCount }, () => items).flat();

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
          From demo reels to brand designs — browse portfolios from creators already on the platform.
        </p>
      </div>

      {/* Scrolling carousel — CSS-only infinite animation */}
      <div className="relative">
        {/* Left/Right fade edges */}
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
                  src={item.thumbnail_url || item.media_url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Media type badge */}
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
              {/* Creator info */}
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarImage src={item.creator_avatar || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {item.creator_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.creator_name}
                    {item.creator_role ? ` · ${item.creator_role}` : ""}
                  </p>
                </div>
              </div>
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
