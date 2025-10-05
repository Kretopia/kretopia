import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, ExternalLink } from "lucide-react";

interface CreditActivityCardProps {
  item: {
    id: string;
    project_name: string;
    role: string;
    platform: string | null;
    year: number | null;
    thumbnail_url: string | null;
    url: string | null;
    created_at: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      role: string;
    };
  };
}

export const CreditActivityCard = ({ item }: CreditActivityCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all">
      {item.thumbnail_url && (
        <div className="relative aspect-video bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <img 
            src={item.thumbnail_url} 
            alt={item.project_name}
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-2 right-2 bg-background/90 backdrop-blur">
            <Briefcase className="h-3 w-3 mr-1 text-purple-500" />
            Credit
          </Badge>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.profiles.avatar_url || undefined} />
            <AvatarFallback>{item.profiles.full_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{item.profiles.full_name}</p>
            <p className="text-xs text-muted-foreground">{item.profiles.role}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-start gap-3">
          {!item.thumbnail_url && (
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-purple-500" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{item.project_name}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {item.role} {item.platform && `• ${item.platform}`} {item.year && `• ${item.year}`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          {item.url ? (
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View Project
            </a>
          ) : (
            <div />
          )}
          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </Card>
  );
};
