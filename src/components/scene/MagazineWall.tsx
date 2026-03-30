import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, Eye, Plus, Sparkles, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MagazineArticleViewer } from "./MagazineArticleViewer";
import { MagazineEditor } from "./MagazineEditor";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  author_name: string;
  author_avatar_url: string | null;
  is_featured: boolean;
  read_time_minutes: number;
  view_count: number;
  created_at: string;
}

const CATEGORIES = ["all", "inspiration", "business", "culture", "how-to", "spotlight"];

export const MagazineWall = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    let query = supabase
      .from("magazine_articles")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (activeCategory !== "all") {
      query = query.eq("category", activeCategory);
    }

    const { data } = await query;
    setArticles((data as Article[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [activeCategory]);

  if (selectedArticle) {
    return <MagazineArticleViewer article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  if (showEditor) {
    return <MagazineEditor onClose={() => setShowEditor(false)} onPublished={() => { setShowEditor(false); fetchArticles(); }} />;
  }

  const featured = articles.find(a => a.is_featured);
  const rest = articles.filter(a => a !== featured);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            ThriveIN Magazine
          </h2>
          <p className="text-xs text-muted-foreground">Stories, insights & creative culture</p>
        </div>
        {user && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowEditor(true)}>
            <Plus className="h-3.5 w-3.5" />
            Write
          </Button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors capitalize",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {cat === "how-to" ? "How-To" : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No articles yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for fresh creative stories</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Featured Article */}
          {featured && (
            <Card
              className="relative overflow-hidden rounded-xl cursor-pointer group border-0"
              onClick={() => setSelectedArticle(featured)}
            >
              <div className="aspect-[16/9] relative">
                {featured.cover_image_url ? (
                  <img
                    src={featured.cover_image_url}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px]">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <Badge variant="secondary" className="mb-2 text-[10px] capitalize">
                    {featured.category}
                  </Badge>
                  <h3 className="text-white font-bold text-lg leading-tight mb-1">{featured.title}</h3>
                  {featured.subtitle && (
                    <p className="text-white/70 text-xs line-clamp-2">{featured.subtitle}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-white/60 text-[10px]">
                    <span>{featured.author_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {featured.read_time_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {featured.view_count}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3">
            {rest.map(article => (
              <Card
                key={article.id}
                className="overflow-hidden rounded-xl cursor-pointer group border-border/50 hover:border-primary/30 transition-colors"
                onClick={() => setSelectedArticle(article)}
              >
                <div className="aspect-[4/3] relative">
                  {article.cover_image_url ? (
                    <img
                      src={article.cover_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <Badge variant="secondary" className="mb-1 text-[9px] capitalize px-1.5 py-0">
                      {article.category}
                    </Badge>
                    <h4 className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                      {article.title}
                    </h4>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{article.author_name}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.read_time_minutes}m
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
