import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Eye, ExternalLink, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";
import { MagazineEditor } from "./MagazineEditor";

// Ensure paragraphs are separated by blank lines so ReactMarkdown produces
// distinct <p> tags (with margin) instead of one giant paragraph with <br>.
const normalizeMarkdown = (raw: string): string => {
  if (!raw) return "";
  // Normalize line endings
  let s = raw.replace(/\r\n?/g, "\n");
  // Collapse 3+ newlines to 2
  s = s.replace(/\n{3,}/g, "\n\n");
  // Promote single newlines to double newlines BETWEEN non-empty lines that
  // aren't already part of a list / quote / heading / table. This converts
  // pasted prose with single \n breaks into proper markdown paragraphs.
  s = s.replace(/([^\n])\n(?!\n|#|>|[-*+] |\d+\. |\||!\[|```)/g, "$1\n\n");
  return s.trim();
};
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { motion } from "framer-motion";
import { coverImageStyle } from "./CoverImageEditor";
import { cn } from "@/lib/utils";

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
  const { isEditorOrAdmin } = useUserRole();
  const [showEditor, setShowEditor] = useState(false);

  if (showEditor) {
    return (
      <MagazineEditor
        articleId={article.id}
        onClose={() => setShowEditor(false)}
        onPublished={() => { setShowEditor(false); onBack(); }}
      />
    );
  }

  const articleSlugOrId = article.slug || article.id;
  const shareUrl = `https://www.thrivein.io/magazine/${articleSlugOrId}`;
  const socialShareUrl = `https://www.thrivein.io/share/magazine/${articleSlugOrId}/`;
  const shareTitle = article.title;
  const shareDescription = article.subtitle || "";

  const normalizedContent = normalizeMarkdown(article.content || "");
  const contentSections = normalizedContent.split(/\n(?=##\s)/).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-1">
          {isEditorOrAdmin && !isPublicPage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowEditor(true)}
              title="Edit article"
              aria-label="Edit article"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {article.slug && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <SocialShareButtons url={shareUrl} title={shareTitle} description={shareDescription} socialUrl={socialShareUrl} />
        </div>
      </div>

      {article.cover_image_url && (
        <div className="relative aspect-[2/1] sm:aspect-[21/9] overflow-hidden">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
            style={coverImageStyle(article.cover_position_x, article.cover_position_y, article.cover_zoom)}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

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

      <div className="px-5 sm:px-6 pb-8">
        {contentSections.map((section, i) => (
          <div key={i}>
            <article className={cn(
              "prose prose-sm sm:prose-base dark:prose-invert max-w-none font-serif",
              // Magazine typography
              "prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground",
              "prose-headings:mt-12 prose-headings:mb-4",
              "prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:leading-tight",
              "prose-h2:relative prose-h2:pb-3 prose-h2:after:content-[''] prose-h2:after:absolute prose-h2:after:bottom-0 prose-h2:after:left-0 prose-h2:after:w-12 prose-h2:after:h-[2px] prose-h2:after:bg-primary",
              "prose-h3:text-lg prose-h3:text-foreground/90",
              // Body text — serif, generous spacing
              "prose-p:text-[15px] sm:prose-p:text-[17px] prose-p:leading-[1.8] prose-p:text-foreground/85 prose-p:mb-6",
              // Drop cap on the very first paragraph of the very first section
              i === 0 && "first-paragraph-dropcap",
              // Links
              "prose-a:text-primary prose-a:font-medium prose-a:underline prose-a:decoration-primary/40 prose-a:underline-offset-4 hover:prose-a:decoration-primary",
              // Pull quotes
              "prose-blockquote:not-italic prose-blockquote:border-0 prose-blockquote:p-0 prose-blockquote:my-10",
              "prose-blockquote:text-xl sm:prose-blockquote:text-2xl prose-blockquote:font-sans prose-blockquote:font-semibold",
              "prose-blockquote:leading-snug prose-blockquote:tracking-tight prose-blockquote:text-foreground",
              "prose-blockquote:relative prose-blockquote:pl-5 prose-blockquote:border-l-[3px] prose-blockquote:border-primary",
              "[&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none [&_blockquote_p]:m-0",
              // Strong & emphasis
              "prose-strong:text-foreground prose-strong:font-bold",
              "prose-em:text-foreground/90",
              // Lists
              "prose-li:text-[15px] sm:prose-li:text-[17px] prose-li:text-foreground/85 prose-li:leading-[1.8] prose-li:my-1",
              "prose-ul:my-5 prose-ol:my-5",
              // Images
              "prose-img:rounded-xl prose-img:my-8",
              // Hr as fancy separator
              "prose-hr:my-10 prose-hr:border-border/40"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{section}</ReactMarkdown>
            </article>
          </div>
        ))}

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