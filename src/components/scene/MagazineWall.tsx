import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BookOpen, Clock, Eye, Plus, Sparkles, TrendingUp, Pencil, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MagazineArticleViewer } from "./MagazineArticleViewer";
import { MagazineEditor } from "./MagazineEditor";
import { coverImageStyle } from "./CoverImageEditor";
import { SmartCover } from "@/components/ui/smart-cover";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  cover_image_url: string | null;
  cover_position_x?: number | null;
  cover_position_y?: number | null;
  cover_zoom?: number | null;
  category: string;
  tags: string[];
  author_name: string;
  author_avatar_url: string | null;
  is_featured: boolean;
  read_time_minutes: number;
  view_count: number;
  created_at: string;
  slug: string | null;
}

const CATEGORIES = ["all", "fashion", "art-culture", "music", "film", "events-festivals", "impact", "community", "web3-ai", "taste-of-bali", "photography", "business", "lifestyle-wellness", "bali-developments", "inspiration", "how-to", "spotlight"];

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  fashion: "Fashion",
  "art-culture": "Art & Culture",
  music: "Music",
  film: "Film",
  "events-festivals": "Events & Festivals",
  impact: "Impact",
  community: "Community",
  "web3-ai": "Web3 & AI",
  "taste-of-bali": "Taste of Bali",
  photography: "Photography",
  business: "Business",
  "lifestyle-wellness": "Lifestyle & Wellness",
  "bali-developments": "Bali Developments",
  inspiration: "Inspiration",
  "how-to": "How-To",
  spotlight: "Spotlight",
};

const formatCategoryLabel = (cat: string) => CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);

type SortKey = "latest" | "most-read" | "trending";

export const MagazineWall = () => {
  const { user } = useAuth();
  const { isEditorOrAdmin } = useUserRole();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchArticles = async () => {
    setLoading(true);
    let query = supabase
      .from("magazine_articles")
      .select("*")
      .eq("is_published", true)
      .limit(60);

    if (activeCategory !== "all") {
      query = query.eq("category", activeCategory);
    }

    if (sort === "most-read") {
      query = query.order("view_count", { ascending: false });
    } else if (sort === "trending") {
      // Trending: last 7 days, ranked by view_count
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", sevenDaysAgo).order("view_count", { ascending: false });
    } else {
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
    }

    const { data } = await query;
    setArticles((data as Article[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [activeCategory, sort]);

  // Client-side search filter
  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.subtitle || "").toLowerCase().includes(q) ||
      a.author_name.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q)
    );
  }, [articles, search]);

  if (selectedArticle) {
    return <MagazineArticleViewer article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  if (showEditor) {
    return (
      <MagazineEditor
        articleId={editingId}
        onClose={() => { setShowEditor(false); setEditingId(null); }}
        onPublished={() => { setShowEditor(false); setEditingId(null); fetchArticles(); }}
      />
    );
  }

  const featured = sort === "latest" ? filteredArticles.find(a => a.is_featured) : undefined;
  const rest = featured ? filteredArticles.filter(a => a !== featured) : filteredArticles;

  const openEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEditingId(id);
    setShowEditor(true);
  };

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
        {user && isEditorOrAdmin && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditingId(null); setShowEditor(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Write
          </Button>
        )}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles, authors, tags…"
            className="pl-9 pr-9 h-9 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest" className="text-xs">Latest</SelectItem>
            <SelectItem value="most-read" className="text-xs">Most Read</SelectItem>
            <SelectItem value="trending" className="text-xs">Trending · 7d</SelectItem>
          </SelectContent>
        </Select>
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
            {formatCategoryLabel(cat)}
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
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No articles match your search" : sort === "trending" ? "No trending articles this week" : "No articles yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different keyword" : "Check back soon for fresh creative stories"}
          </p>
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
                <SmartCover
                  src={featured.cover_image_url}
                  alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  style={coverImageStyle(featured.cover_position_x, featured.cover_position_y, featured.cover_zoom)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px]">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
                {isEditorOrAdmin && (
                  <button
                    onClick={(e) => openEdit(e, featured.id)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background flex items-center justify-center transition-colors"
                    aria-label="Edit article"
                    title="Edit article"
                  >
                    <Pencil className="h-3.5 w-3.5 text-foreground" />
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <Badge variant="secondary" className="mb-2 text-[10px] capitalize">
                    {formatCategoryLabel(featured.category)}
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
                  <SmartCover
                    src={article.cover_image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={coverImageStyle(article.cover_position_x, article.cover_position_y, article.cover_zoom)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {isEditorOrAdmin && (
                    <button
                      onClick={(e) => openEdit(e, article.id)}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Edit article"
                      title="Edit article"
                    >
                      <Pencil className="h-3 w-3 text-foreground" />
                    </button>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <Badge variant="secondary" className="mb-1 text-[9px] capitalize px-1.5 py-0">
                      {formatCategoryLabel(article.category)}
                    </Badge>
                    <h4 className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                      {article.title}
                    </h4>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate">{article.author_name}</span>
                  <span className="flex items-center gap-1 shrink-0 ml-2">
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
