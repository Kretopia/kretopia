import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Eye, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

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
}

interface Props {
  article: Article;
  onBack: () => void;
}

export const MagazineArticleViewer = ({ article, onBack }: Props) => {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: article.title, text: article.subtitle || "", url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Cover */}
      {article.cover_image_url && (
        <div className="rounded-xl overflow-hidden aspect-[16/9]">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Meta */}
      <div>
        <Badge variant="secondary" className="mb-2 capitalize text-[10px]">{article.category}</Badge>
        <h1 className="text-xl font-bold leading-tight mb-1">{article.title}</h1>
        {article.subtitle && (
          <p className="text-sm text-muted-foreground">{article.subtitle}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{article.author_name}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.read_time_minutes} min read
          </span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Content */}
      <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-p:text-muted-foreground prose-a:text-primary">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </article>
    </div>
  );
};
