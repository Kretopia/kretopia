import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Lock, Crown, DollarSign, TrendingUp, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CircleData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  icon_emoji: string;
  cover_url: string | null;
  member_count: number;
  message_count: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
  is_private: boolean;
  is_paid: boolean;
  price_monthly: number;
  currency: string;
  circle_type: string;
  invite_code: string | null;
  rules: string | null;
  welcome_message?: string | null;
  creator_name?: string;
  creator_avatar?: string;
  is_member?: boolean;
  user_role?: string;
}

const isNew = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
};

const getActivityLevel = (messageCount: number) => {
  if (messageCount > 200) return { label: "Very Active", color: "text-orange-500" };
  if (messageCount > 50) return { label: "Active", color: "text-emerald-500" };
  return null;
};

export const CircleCard = ({ circle, onClick }: { circle: CircleData; onClick: () => void }) => {
  const activity = getActivityLevel(circle.message_count);
  const circleIsNew = isNew(circle.created_at);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card hover:border-primary/30 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
      onClick={onClick}
    >
      {/* Cover gradient */}
      {circle.cover_url ? (
        <div className="h-20 w-full overflow-hidden">
          <img src={circle.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent to-card" />
        </div>
      ) : (
        <div className={cn(
          "h-16 w-full bg-gradient-to-br opacity-80",
          circle.category === "music" ? "from-primary/20 to-fuchsia-500/20" :
          circle.category === "film" ? "from-rose-500/20 to-orange-500/20" :
          circle.category === "design" ? "from-primary/20 to-primary/20" :
          circle.category === "tech" ? "from-emerald-500/20 to-teal-500/20" :
          circle.category === "business" ? "from-amber-500/20 to-yellow-500/20" :
          "from-primary/10 to-primary/5"
        )} />
      )}

      {/* New badge */}
      {circleIsNew && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground animate-pulse gap-0.5">
            <Sparkles className="h-2.5 w-2.5" /> New
          </Badge>
        </div>
      )}

      <div className="px-4 pb-4 -mt-6 relative">
        <div className="flex items-end gap-3 mb-2">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-card border-2 border-background shadow-md flex items-center justify-center text-xl shrink-0">
              {circle.icon_emoji}
            </div>
            {/* Activity pulse */}
            {activity && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card">
                <div className="w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm truncate">{circle.title}</h3>
              {circle.is_private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
            </div>
            {circle.creator_name && (
              <p className="text-[10px] text-muted-foreground truncate">by {circle.creator_name}</p>
            )}
          </div>
          {circle.is_member ? (
            <Badge className="text-[10px] px-2 py-0.5 shrink-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Joined</Badge>
          ) : circle.is_paid ? (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 shrink-0 border-amber-500/50 text-amber-600 bg-amber-500/5">
              <DollarSign className="h-2.5 w-2.5 mr-0.5" />{circle.price_monthly}/mo
            </Badge>
          ) : null}
        </div>

        {circle.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">{circle.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {circle.member_count}
          </span>
          {circle.message_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {circle.message_count > 999 ? `${(circle.message_count / 1000).toFixed(1)}k` : circle.message_count}
            </span>
          )}
          {circle.user_role === 'admin' && (
            <span className="flex items-center gap-1 text-amber-600">
              <Crown className="h-3 w-3" /> Admin
            </span>
          )}
          {activity && (
            <span className={cn("flex items-center gap-1 ml-auto", activity.color)}>
              <TrendingUp className="h-3 w-3" /> {activity.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
