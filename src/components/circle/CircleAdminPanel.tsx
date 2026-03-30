import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3, Users, MessageSquare, TrendingUp, Crown, Shield, User,
  Settings, Calendar, DollarSign, Mail, Sparkles, Check, Loader2, UserPlus,
} from "lucide-react";
import { CircleInviteTools } from "./CircleInviteTools";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [stats, setStats] = useState({ messagesThisWeek: 0, newMembersThisWeek: 0, totalReactions: 0, messagesLastWeek: 0, newMembersLastWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'analytics' | 'members' | 'settings' | 'events' | 'invite'>('analytics');
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [welcomeDmEnabled, setWelcomeDmEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [circle.id]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("spark_rooms")
      .select("welcome_message")
      .eq("id", circle.id)
      .single();
    if (data?.welcome_message) {
      setWelcomeMessage(data.welcome_message);
      setWelcomeDmEnabled(true);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    const msg = welcomeDmEnabled ? welcomeMessage.trim() || null : null;
    await supabase
      .from("spark_rooms")
      .update({ welcome_message: msg } as any)
      .eq("id", circle.id);
    setSaving(false);
    toast({ title: "Settings saved ✅" });
  };

  const fetchData = async () => {
    setLoading(true);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [membersRes, messagesRes, newMembersRes, reactionsRes, messagesLastRes, membersLastRes] = await Promise.all([
      supabase.from("spark_room_members").select("user_id, role, joined_at").eq("room_id", circle.id).order("joined_at", { ascending: false }),
      supabase.from("spark_room_messages").select("id", { count: "exact", head: true }).eq("room_id", circle.id).gte("created_at", weekAgo),
      supabase.from("spark_room_members").select("id", { count: "exact", head: true }).eq("room_id", circle.id).gte("joined_at", weekAgo),
      supabase.from("spark_message_reactions").select("id", { count: "exact", head: true }).in("message_id", [circle.id]),
      supabase.from("spark_room_messages").select("id", { count: "exact", head: true }).eq("room_id", circle.id).gte("created_at", twoWeeksAgo).lt("created_at", weekAgo),
      supabase.from("spark_room_members").select("id", { count: "exact", head: true }).eq("room_id", circle.id).gte("joined_at", twoWeeksAgo).lt("joined_at", weekAgo),
    ]);

    if (membersRes.data?.length) {
      const userIds = membersRes.data.map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
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
      messagesLastWeek: messagesLastRes.count || 0,
      newMembersLastWeek: membersLastRes.count || 0,
    });
    setLoading(false);
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    await supabase.from("spark_room_members").update({ role: newRole }).eq("room_id", circle.id).eq("user_id", userId);
    fetchData();
  };

  const roleIcon = (role: string) => {
    if (role === 'admin') return <Crown className="h-3 w-3 text-amber-500" />;
    if (role === 'moderator') return <Shield className="h-3 w-3 text-blue-500" />;
    return <User className="h-3 w-3 text-muted-foreground" />;
  };

  const trendArrow = (current: number, previous: number) => {
    if (previous === 0 && current > 0) return <span className="text-emerald-500 text-[10px]">↑ New</span>;
    if (current > previous) return <span className="text-emerald-500 text-[10px]">↑ {Math.round(((current - previous) / (previous || 1)) * 100)}%</span>;
    if (current < previous) return <span className="text-destructive text-[10px]">↓ {Math.round(((previous - current) / (previous || 1)) * 100)}%</span>;
    return <span className="text-muted-foreground text-[10px]">— same</span>;
  };

  const views = [
    { key: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
    { key: 'members' as const, icon: Users, label: 'Members' },
    { key: 'invite' as const, icon: UserPlus, label: 'Invite' },
    { key: 'settings' as const, icon: Settings, label: 'Settings' },
    { key: 'events' as const, icon: Calendar, label: 'Events' },
  ];

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
          {views.map(v => (
            <Button
              key={v.key}
              variant={activeView === v.key ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setActiveView(v.key)}
            >
              <v.icon className="h-3.5 w-3.5 mr-1" />
              {v.label}
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
                {trendArrow(stats.messagesThisWeek, stats.messagesLastWeek)}
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">+{stats.newMembersThisWeek}</p>
                <p className="text-[10px] text-muted-foreground">New/week</p>
                {trendArrow(stats.newMembersThisWeek, stats.newMembersLastWeek)}
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
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Engagement Health
              </h4>
              <div className="space-y-2.5">
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
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Member retention</span>
                  <span className="font-medium">
                    {members.length > 0 
                      ? `${Math.round((members.filter(m => {
                          const joined = new Date(m.joined_at);
                          return (Date.now() - joined.getTime()) > 7 * 24 * 60 * 60 * 1000;
                        }).length / members.length) * 100)}%`
                      : "N/A"
                    }
                  </span>
                </div>
              </div>
            </Card>

            {/* Top contributors */}
            <Card className="p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Top Members
              </h4>
              <div className="space-y-2">
                {members.slice(0, 5).map((member, i) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar_url || ""} />
                      <AvatarFallback className="text-[9px]">{member.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium flex-1 truncate">{member.full_name}</span>
                    {roleIcon(member.role)}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Members View */}
        {activeView === 'members' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
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
                      <option value="mentor">✨ Mentor</option>
                      <option value="featured">⭐ Featured Creator</option>
                      <option value="og">🏆 OG Member</option>
                      <option value="vip">💎 VIP</option>
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

        {/* Settings View */}
        {activeView === 'settings' && (
          <div className="space-y-4">
            {/* Welcome DM */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Welcome DM</h4>
                </div>
                <Button
                  variant={welcomeDmEnabled ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setWelcomeDmEnabled(!welcomeDmEnabled)}
                >
                  {welcomeDmEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Automatically send a private message to new members when they join this circle.
              </p>
              {welcomeDmEnabled && (
                <Textarea
                  placeholder="Hey! Welcome to the circle 👋 Feel free to introduce yourself and share what you're working on!"
                  value={welcomeMessage}
                  onChange={e => setWelcomeMessage(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px] text-sm"
                />
              )}
            </Card>

            {/* Circle Info */}
            <Card className="p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Circle Info
              </h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="text-foreground">{new Date(circle.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="text-foreground capitalize">{circle.circle_type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Visibility</span>
                  <span className="text-foreground">{circle.is_private ? "Private" : "Public"}</span>
                </div>
                {circle.invite_code && (
                  <div className="flex justify-between">
                    <span>Invite Code</span>
                    <span className="text-foreground font-mono">{circle.invite_code}</span>
                  </div>
                )}
              </div>
            </Card>

            <Button className="w-full" variant="gradient" onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        )}

        {/* Invite View */}
        {activeView === 'invite' && (
          <CircleInviteTools circleId={circle.id} circleTitle={circle.title} inviteCode={circle.invite_code} />
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
