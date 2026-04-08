import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Eye, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { motion } from "framer-motion";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  author_name: string;
  author_avatar_url: string | null;
  read_time_minutes: number;
  view_count: number;
  created_at: string;
  slug?: string | null;
}

interface Props {
  article: Article;
  onBack: () => void;
  isPublicPage?: boolean;
  isAuthenticated?: boolean;
}

export const MagazineArticleViewer = ({ article, onBack, isPublicPage = false, isAuthenticated = true }: Props) => {
  const articleSlugOrId = article.slug || article.id;
  const ogProxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-magazine?slug=${articleSlugOrId}`;
  const shareUrl = ogProxyUrl;

  const shareTitle = article.title;
  const shareDescription = article.subtitle || "";

  // Split markdown content into sections for inline image insertion
  const contentSections = article.content.split(/\n(?=##\s)/).filter(Boolean);

  // Category-themed inline images for visual breaks
  const inlineImages: Record<string, string[]> = {
    fashion: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
    ],
    "art-culture": [
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
    ],
    music: [
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80",
    ],
    film: [
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    ],
    "events-festivals": [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    ],
    photography: [
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
    ],
    business: [
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80",
    ],
    inspiration: [
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80",
    ],
    "how-to": [
      "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800&q=80",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
    ],
    spotlight: [
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
    ],
  };

  const categoryImages = inlineImages[article.category] || inlineImages.inspiration;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-1">
          {article.slug && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <SocialShareButtons url={shareUrl} title={shareTitle} description={shareDescription} />
        </div>
      </div>

      {/* Hero Cover */}
      {article.cover_image_url && (
        <div className="relative aspect-[2/1] sm:aspect-[21/9] overflow-hidden">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      {/* Article Header */}
      <header className="px-5 pt-6 pb-4 space-y-3">
        <Badge variant="secondary" className="capitalize text-[11px] font-medium">
          {article.category}
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.15] tracking-tight text-foreground">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-light">
            {article.subtitle}
          </p>
        )}
        <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t border-border/50">
          <div className="flex items-center gap-2">
            {article.author_avatar_url ? (
              <img src={article.author_avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">T</span>
              </div>
            )}
            <span className="font-semibold text-foreground">{article.author_name}</span>
          </div>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.read_time_minutes} min read
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {article.view_count || 0}
          </span>
          <span className="hidden sm:inline">
            {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
          </span>
        </div>
      </header>

      {/* Article Body */}
      <div className="px-5 pb-8">
        {contentSections.map((section, i) => (
          <div key={i}>
            {/* Render markdown section */}
            <article className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mt-10 prose-headings:mb-4
              prose-h2:text-lg prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-2.5
              prose-p:text-sm prose-p:leading-[1.85] prose-p:text-muted-foreground prose-p:mb-5
              prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:not-italic prose-blockquote:text-foreground prose-blockquote:font-medium prose-blockquote:text-sm prose-blockquote:my-6
              prose-strong:text-foreground
              prose-li:text-sm prose-li:text-muted-foreground prose-li:leading-[1.85]
              prose-ul:my-4 prose-ol:my-4
              [&>*+*]:mt-5
            ">
              <ReactMarkdown>{section}</ReactMarkdown>
            </article>

            {/* Insert inline image after the first and third sections */}
            {(i === 0 || i === 2) && categoryImages[i === 0 ? 0 : 1] && (
              <figure className="my-8 rounded-xl overflow-hidden">
                <img
                  src={categoryImages[i === 0 ? 0 : 1]}
                  alt={`Visual for ${article.category} — ${article.title}`}
                  className="w-full aspect-[16/9] object-cover"
                  loading="lazy"
                />
                <figcaption className="text-[11px] text-muted-foreground mt-2 text-center italic">
                  ThriveIN Magazine — {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                </figcaption>
              </figure>
            )}
          </div>
        ))}

        {/* Tags */}
        {article.slug && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border/50">
            <span className="text-xs text-muted-foreground mr-1">Tags:</span>
            {["creator economy", "creative professionals", article.category].map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* CTA Banner for non-authenticated visitors */}
      {!isAuthenticated && (
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/0 pt-8">
          <div className="mx-4 mb-4 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border border-primary/20 backdrop-blur-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-black text-primary">T</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Join ThriveIN — The Creative Economy Platform
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Connect with creatives worldwide, discover collaboration opportunities, manage projects, 
                  and grow your creative career. All in one place.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1 font-semibold">
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
