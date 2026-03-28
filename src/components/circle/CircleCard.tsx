import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Lock, Crown, DollarSign } from "lucide-react";
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
  creator_name?: string;
  creator_avatar?: string;
  is_member?: boolean;
  user_role?: string;
}

export const CircleCard = ({ circle, onClick }: { circle: CircleData; onClick: () => void }) => (
  <div
    className="flex gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/5 cursor-pointer transition-all hover:shadow-md"
    onClick={onClick}
  >
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl">
      {circle.icon_emoji}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h3 className="font-semibold text-sm truncate">{circle.title}</h3>
        {circle.is_private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
        {circle.is_paid && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-amber-500/50 text-amber-600">
            <DollarSign className="h-2.5 w-2.5 mr-0.5" />
            {circle.price_monthly}/{circle.currency === 'USD' ? 'mo' : circle.currency}
          </Badge>
        )}
        {circle.is_member && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Joined</Badge>
        )}
      </div>
      {circle.description && (
        <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{circle.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {circle.member_count}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> {circle.message_count}
        </span>
        {circle.user_role === 'admin' && (
          <span className="flex items-center gap-1 text-amber-600">
            <Crown className="h-3 w-3" /> Owner
          </span>
        )}
      </div>
    </div>
  </div>
);
