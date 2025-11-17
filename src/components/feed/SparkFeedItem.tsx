import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { FeedPost } from "./FeedPost";
import { PortfolioItemCard } from "./PortfolioItemCard";
import { AwardActivityCard } from "./AwardActivityCard";
import { CreditActivityCard } from "./CreditActivityCard";
import { PressActivityCard } from "./PressActivityCard";
import { SparkItemWrapper } from "./SparkItemWrapper";

interface SparkFeedItemProps {
  item: {
    id: string;
    type: 'portfolio' | 'award' | 'credit' | 'press' | 'post' | 'community_post';
    user: {
      id: string;
      name: string;
      avatar: string;
      role: string;
      location?: string;
    };
    content: any;
    created_at: string;
  };
}

export const SparkFeedItem = ({ item }: SparkFeedItemProps) => {
  const renderContent = () => {
    switch (item.type) {
      case 'post':
        return (
          <FeedPost
            post={{
              ...item.content,
              profile: {
                full_name: item.user.name,
                avatar_url: item.user.avatar,
                role: item.user.role
              }
            }}
          />
        );
      case 'portfolio':
        return (
          <PortfolioItemCard
            item={{
              ...item.content,
              profiles: {
                full_name: item.user.name,
                avatar_url: item.user.avatar,
                role: item.user.role
              }
            }}
          />
        );
      case 'award':
        return <AwardActivityCard item={item.content} />;
      case 'credit':
        return <CreditActivityCard item={item.content} />;
      case 'press':
        return <PressActivityCard item={item.content} />;
      default:
        return null;
    }
  };

  const mapItemType = (type: string) => {
    if (type === 'post') return 'feed_post';
    if (type === 'portfolio') return 'portfolio_item';
    return type as 'award' | 'credit' | 'press' | 'community_post';
  };

  return (
    <SparkItemWrapper itemId={item.id} itemType={mapItemType(item.type)}>
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <Link to={`/profile/${item.user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.user.avatar} />
              <AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{item.user.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {item.user.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </Link>
        </div>
        {renderContent()}
      </div>
    </SparkItemWrapper>
  );
};
