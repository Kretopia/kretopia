import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Shield, Star, Trash2, Award, Trophy, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AchievementCardProps {
  variant: "credit" | "press" | "award" | "stat";
  title: string;
  subtitle?: string;
  description?: string;
  year?: number | string;
  imageUrl?: string;
  url?: string;
  verificationStatus?: "unverified" | "pending" | "verified";
  endorsementCount?: number;
  isFeatured?: boolean;
  isOwnProfile?: boolean;
  onDelete?: () => void;
  onRequestEndorsement?: () => void;
  icon?: React.ReactNode;
  metadata?: Record<string, string | number>;
}

export const AchievementCard = ({
  variant,
  title,
  subtitle,
  description,
  year,
  imageUrl,
  url,
  verificationStatus = "unverified",
  isFeatured = false,
  isOwnProfile = false,
  onDelete,
  icon,
  metadata,
}: AchievementCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "credit":
        return "border-primary/20 hover:border-primary/40";
      case "press":
        return "border-secondary/20 hover:border-secondary/40";
      case "award":
        return "border-amber-500/20 hover:border-amber-500/40";
      case "stat":
        return "border-muted hover:border-muted-foreground/20";
      default:
        return "";
    }
  };

  const VerificationBadge = () => {
    if (verificationStatus === "verified") {
      return (
        <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
          <Shield className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    return null;
  };

  // Compact layout for awards without images
  const isCompact = variant === "award" && !imageUrl;

  // Check if title contains "winner" or "won" for trophy icon
  const isWinner = title.toLowerCase().includes('winner') || 
                   title.toLowerCase().includes('won') ||
                   description?.toLowerCase().includes('winner') ||
                   description?.toLowerCase().includes('won');

  if (isCompact) {
    return (
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
          getVariantStyles(),
          isFeatured && "ring-2 ring-amber-500/20"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Compact Icon */}
            <div className={cn(
              "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              isWinner 
                ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-400" 
                : "bg-muted text-muted-foreground"
            )}>
              {isWinner ? (
                <Trophy className="h-5 w-5" />
              ) : (
                <Award className="h-5 w-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {title}
                </h3>
                {year && (
                  <span className="text-xs text-muted-foreground shrink-0">{year}</span>
                )}
              </div>

              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}

              {description && (
                <p className="text-xs text-muted-foreground/80 line-clamp-1">{description}</p>
              )}

              {/* Metadata & Actions Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {metadata && Object.entries(metadata).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {value}
                    </Badge>
                  ))}
                  {isFeatured && (
                    <Badge variant="default" className="gap-0.5 text-[10px] px-1.5 py-0">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Featured
                    </Badge>
                  )}
                  <VerificationBadge />
                </div>
                <div className="flex items-center gap-1">
                  {url && (
                    <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {isOwnProfile && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDelete}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Original layout for cards with images
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        getVariantStyles(),
        isFeatured && "ring-2 ring-primary/20"
      )}
    >
      <CardContent className="p-0">
        {/* Thumbnail/Icon Section */}
        {imageUrl && (
          <div className="relative h-48 bg-muted overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {isFeatured && (
              <div className="absolute top-3 left-3">
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            {year && (
              <span className="text-xs text-muted-foreground shrink-0">{year}</span>
            )}
          </div>

          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}

          {/* Metadata */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(metadata).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {value}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <VerificationBadge />
            </div>
            <div className="flex items-center gap-2">
              {url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8"
                >
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {isOwnProfile && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};