import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Package, Wrench, MapPin, Clock, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ListingCardProps {
  listing: {
    [key: string]: any;
    id: string;
    user_id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    product_type: string;
    listing_type: string;
    category: string;
    preview_urls: string[];
    download_count: number;
    tags: string[];
    condition?: string;
    shipping_method?: string;
    shipping_price?: number;
    item_location?: string;
    service_format?: string;
    service_duration?: string;
    is_virtual?: boolean;
    profiles?: {
      full_name: string;
      avatar_url: string;
      role: string;
    };
  };
}

const TYPE_CONFIG = {
  digital: { icon: Download, color: "bg-blue-500/10 text-blue-500", label: "Digital" },
  physical: { icon: Package, color: "bg-amber-500/10 text-amber-500", label: "Physical" },
  service: { icon: Wrench, color: "bg-emerald-500/10 text-emerald-500", label: "Service" },
};

const ListingCard = ({ listing, isSaved, onToggleSave }: ListingCardProps & { isSaved?: boolean; onToggleSave?: (id: string) => void }) => {
  const navigate = useNavigate();
  const typeConfig = TYPE_CONFIG[listing.listing_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.digital;
  const TypeIcon = typeConfig.icon;

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => navigate(`/market/${listing.id}`)}
    >
      {listing.preview_urls?.[0] ? (
        <div className="aspect-video bg-muted relative overflow-hidden">
          <img
            src={listing.preview_urls[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <Badge className={`absolute top-2 left-2 ${typeConfig.color} border-0 text-xs`}>
            <TypeIcon className="h-3 w-3 mr-1" />
            {typeConfig.label}
          </Badge>
          {onToggleSave && (
            <button
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleSave(listing.id); }}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            </button>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-muted/50 flex items-center justify-center relative">
          <TypeIcon className="h-10 w-10 text-muted-foreground/30" />
          <Badge className={`absolute top-2 left-2 ${typeConfig.color} border-0 text-xs`}>
            <TypeIcon className="h-3 w-3 mr-1" />
            {typeConfig.label}
          </Badge>
          {onToggleSave && (
            <button
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleSave(listing.id); }}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            </button>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-1">{listing.title}</h3>
          {listing.category && (
            <Badge variant="outline" className="text-xs shrink-0 capitalize">
              {listing.category}
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {listing.description}
        </p>

        {/* Physical item details */}
        {listing.listing_type === "physical" && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {listing.condition && (
              <span className="flex items-center gap-1 capitalize">
                <Package className="h-3 w-3" /> {listing.condition.replace("_", " ")}
              </span>
            )}
            {listing.item_location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {listing.item_location}
              </span>
            )}
          </div>
        )}

        {/* Service details */}
        {listing.listing_type === "service" && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {listing.service_duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {listing.service_duration}
              </span>
            )}
            {listing.service_format && (
              <Badge variant="outline" className="text-xs capitalize">
                {listing.service_format === "both" ? "Virtual / In Person" : listing.service_format.replace("_", " ")}
              </Badge>
            )}
          </div>
        )}

        {listing.profiles && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {listing.profiles.avatar_url ? (
                <img src={listing.profiles.avatar_url} alt={listing.profiles.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-medium">{listing.profiles.full_name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <span>{listing.profiles.full_name}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-lg text-primary truncate">
              {listing.currency === "USD" ? "$" : listing.currency}{listing.price}
              {listing.listing_type === "service" && <span className="text-xs font-normal text-muted-foreground">/session</span>}
            </span>
            {listing.listing_type === "physical" && listing.shipping_price && listing.shipping_price > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">+${listing.shipping_price} ship</span>
            )}
            {listing.listing_type === "digital" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                <Download className="h-3 w-3" /> {listing.download_count}
              </span>
            )}
          </div>
          <Button size="sm" className="shrink-0">View</Button>
        </div>

        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {listing.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ListingCard;
