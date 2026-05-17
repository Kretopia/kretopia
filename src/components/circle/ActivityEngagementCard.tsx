import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Flame, MessageCircle, Share2, Sparkles, Palette, Trophy, Newspaper, Clapperboard } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ActivityEngagementCardProps {
  activity: any;
  onLike?: (activityId: string) => void;
  onComment?: (activityId: string) => void;
  onShare?: (activityId: string) => void;
}

export const ActivityEngagementCard = ({
  activity,
  onLike,
  onComment,
  onShare
}: ActivityEngagementCardProps) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const profile = activity.profiles;
  
  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.(activity.id);
  };

  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'portfolio':
        return <Palette className="h-4 w-4 text-primary" />;
      case 'award':
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case 'press':
        return <Newspaper className="h-4 w-4 text-primary" />;
      case 'credit':
        return <Clapperboard className="h-4 w-4 text-emerald-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  const getActivityAction = () => {
    switch (activity.activity_type) {
      case 'portfolio':
        return 'added new work';
      case 'award':
        return 'won an award';
      case 'press':
        return 'was featured in press';
      case 'credit':
        return 'added a new credit';
      default:
        return 'shared an update';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar 
          className="h-10 w-10 cursor-pointer"
          onClick={() => navigate(`/profile/${activity.user_id}`)}
        >
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span 
              className="font-semibold cursor-pointer hover:text-primary"
              onClick={() => navigate(`/profile/${activity.user_id}`)}
            >
              {profile?.full_name || 'Unknown User'}
            </span>
            {' '}
            <span className="text-muted-foreground">{getActivityAction()}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </p>
        </div>
        <span className="text-2xl">{getActivityIcon()}</span>
      </div>

      {/* Content */}
      <div className="mb-3">
        {activity.title && (
          <h4 className="font-semibold mb-1">{activity.title}</h4>
        )}
        {(activity.description || activity.bio) && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {activity.description || activity.bio}
          </p>
        )}
        {activity.thumbnail_url && (
          <img 
            src={activity.thumbnail_url} 
            alt={activity.title}
            className="rounded-lg mt-2 w-full h-48 object-cover cursor-pointer"
            onClick={() => navigate(`/profile/${activity.user_id}`)}
          />
        )}
      </div>

      {/* Engagement Actions */}
      <div className="flex items-center gap-1 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${liked ? 'text-orange-500' : ''}`}
          onClick={handleLike}
        >
          <Flame className={`h-4 w-4 ${liked ? 'fill-orange-500' : ''}`} />
          {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => {
            navigate(`/profile/${activity.user_id}`);
            onComment?.(activity.id);
          }}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">Comment</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 ml-auto"
          onClick={() => onShare?.(activity.id)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
