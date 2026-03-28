import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, MessageSquare, UserPlus, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  level: number | null;
  badge: string | null;
}

const PAGE_SIZE = 20;

export function CreatorBrowseGrid() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creators, setCreators] = useState<ProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchCreators();
  }, [search, page]);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location, level, badge', { count: 'exact' })
        .eq('is_claimed', true)
        .not('full_name', 'is', null)
        .order('level', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,role.ilike.%${search}%,location.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setCreators((data || []) as ProfileInfo[]);
      setTotal(count || 0);
    } catch (err) {
      console.error('Error fetching creators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (targetId: string) => {
    if (!user?.id) { toast.error('Sign in to connect'); return; }
    if (targetId === user.id) return;
    try {
      const { data: existing } = await supabase.from('connections').select('id')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) { toast.info('Already connected or pending'); return; }
      await supabase.from('connections').insert({ user_id: user.id, connected_user_id: targetId, status: 'pending' });
      toast.success('Connection request sent!');
    } catch { toast.error('Failed to send request'); }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search creators by name, role, or location..."
          className="pl-9 h-10"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{total} creators</p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-3 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
            </CardContent></Card>
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No creators found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {creators.map(creator => (
            <Card key={creator.user_id} className="overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${creator.user_id}`)}>
                  <AvatarImage src={creator.avatar_url || ''} />
                  <AvatarFallback>{creator.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${creator.user_id}`)}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{creator.full_name}</p>
                    {creator.badge === 'ODOS' && <Badge variant="secondary" className="text-[9px] h-4">ODOS</Badge>}
                  </div>
                  {creator.role && <p className="text-xs text-muted-foreground truncate">{creator.role}</p>}
                  {creator.location && <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="h-2.5 w-2.5" /> {creator.location}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/messages?user=${creator.user_id}`)}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleConnect(creator.user_id)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
