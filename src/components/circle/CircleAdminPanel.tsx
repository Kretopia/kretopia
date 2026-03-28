import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart3, Users, MessageSquare, TrendingUp, Crown, Shield, User,
  Settings, Calendar, DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { CircleData } from "./CircleCard";

interface CircleMember {
  user_id: string;
  role: string;
  joined_at: string;
  full_name?: string;
  avatar_url?: string;
}

interface CircleAdminPanelProps {
  circle: CircleData;
  onClose: () => void;
}

export const CircleAdminPanel = ({ circle, onClose }: CircleAdminPanelProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [stats, setStats] = useState({ messagesThisWeek: 0, newMembersThisWeek: 0, totalReactions: 0 });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'analytics' | 'members' | 'events'>('analytics');

  useEffect(() => {
    fetchData();
  }, [circle.id]);

  const fetchData = async () => {
    setLoading(true);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [membersRes, messagesRes, newMembersRes, reactionsRes] = await Promise.all([
      supabase
        .from("spark_room_members")
        .select("user_id, role, joined_at")
        .eq("room_id", circle.id)
        .order("joined_at", { ascending: false }),
      supabase
        .from("spark_room_messages")
        .select("id", { count: "exact", head: true })
        .eq("room_id", circle.id)
        .gte("created_at", weekAgo),
      supabase
        .from("spark_room_members")
        .select("id", { count: "exact", head: true })
        .eq("room_id", circle.id)
        .gte("joined_at", weekAgo),
      supabase
        .from("spark_message_reactions")
        .select("id", { count: "exact", head: true })
        .in("message_id", [circle.id]),
    ]);

    if (membersRes.data?.length) {
      const userIds = membersRes.data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setMembers(membersRes.data.map(m => ({
        ...m,
        full_name: profileMap.get(m.user_id)?.full_name || "Unknown",
        avatar_url: profileMap.get(m.user_id)?.avatar_url || undefined,
      })));
    }

    setStats({
      messagesThisWeek: messagesRes.count || 0,
      newMembersThisWeek: newMembersRes.count || 0,
      totalReactions: reactionsRes.count || 0,
    });
    setLoading(false);
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    await supabase
      .from("spark_room_members")
      .update({ role: newRole })
      .eq("room_id", circle.id)
      .eq("user_id", userId);
    fetchData();
  };

  const roleIcon = (role: string) => {
    if (role === 'admin') return <Crown className="h-3 w-3 text-amber-500" />;
    if (role === 'moderator') return <Shield className="h-3 w-3 text-blue-500" />;
    return <User className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Circle Settings
          </DialogTitle>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(['analytics', 'members', 'events'] as const).map(view => (
            <Button
              key={view}
              variant={activeView === view ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs capitalize"
              onClick={() => setActiveView(view)}
            >
              {view === 'analytics' && <BarChart3 className="h-3.5 w-3.5 mr-1" />}
              {view === 'members' && <Users className="h-3.5 w-3.5 mr-1" />}
              {view === 'events' && <Calendar className="h-3.5 w-3.5 mr-1" />}
              {view}
            </Button>
          ))}
        </div>

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold">{circle.member_count}</p>
                <p className="text-[10px] text-muted-foreground">Members</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.messagesThisWeek}</p>
                <p className="text-[10px] text-muted-foreground">Msgs/week</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">+{stats.newMembersThisWeek}</p>
                <p className="text-[10px] text-muted-foreground">New/week</p>
              </Card>
            </div>

            {circle.is_paid && (
              <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm">Revenue</h4>
                </div>
                <p className="text-2xl font-bold">
                  ${(circle.price_monthly * circle.member_count).toFixed(0)}
                  <span className="text-sm font-normal text-muted-foreground">/mo potential</span>
                </p>
              </Card>
            )}

            <Card className="p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Engagement Health
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Messages per member</span>
                  <span className="font-medium">
                    {circle.member_count > 0 ? (circle.message_count / circle.member_count).toFixed(1) : 0}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total messages</span>
                  <span className="font-medium">{circle.message_count}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total reactions</span>
                  <span className="font-medium">{stats.totalReactions}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Members View */}
        {activeView === 'members' && (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || ""} />
                  <AvatarFallback className="text-xs">{member.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {roleIcon(member.role)}
                  {member.user_id !== user?.id && member.user_id !== circle.created_by && (
                    <select
                      className="text-xs bg-muted/50 border border-border rounded px-1.5 py-0.5"
                      value={member.role}
                      onChange={e => updateMemberRole(member.user_id, e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  {member.user_id === circle.created_by && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Owner</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events View */}
        {activeView === 'events' && (
          <CircleEvents circleId={circle.id} circleTitle={circle.title} />
        )}
      </DialogContent>
    </Dialog>
  );
};

const CircleEvents = ({ circleId, circleTitle }: { circleId: string; circleTitle: string }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("creative_jams")
        .select("id, title, start_time, status, category")
        .eq("circle_id", circleId)
        .order("start_time", { ascending: false })
        .limit(20);
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, [circleId]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Events linked to "{circleTitle}". Create events from the Events tab and link them here.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      ) : events.length === 0 ? (
        <Card className="p-6 text-center">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No events linked yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create events and assign them to this circle</p>
        </Card>
      ) : (
        events.map(event => (
          <Card key={event.id} className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.start_time).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={event.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                {event.status}
              </Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
