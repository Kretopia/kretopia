import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/**
 * HotLeadsStrip — surfaces unread inbound messages that smell like real
 * booking/hiring intent (budget, rate, hire, book, available, project, brief…).
 *
 * Pure read-only triage signal. Lives at the top of /inbox so a creator
 * landing in NYC for a busy week sees the *money* messages first.
 */

// Words that almost always indicate hire/booking intent.
const HOT_PATTERNS = [
  /\b(hire|hiring|book|booking|booked)\b/i,
  /\b(budget|rate|rates|quote|fee|fees|cost)\b/i,
  /\b(available|availability)\b/i,
  /\b(project|gig|shoot|campaign|brief|treatment)\b/i,
  /\b(paid|pay|payment|invoice)\b/i,
  /\$\s?\d/,
];

interface Lead {
  conversation_id: string | null;
  sender_id: string;
  preview: string;
  created_at: string;
  matched: string;
  sender_name?: string;
  sender_avatar?: string | null;
}

export function HotLeadsStrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await (supabase as any)
          .from("messages")
          .select("id, sender_id, recipient_id, content, created_at, conversation_id, read_at")
          .eq("recipient_id", user.id)
          .is("read_at", null)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(80)
          .then((r: any) => r, () => ({ data: [] }));

        if (!data || cancelled) { setLoading(false); return; }

        const seen = new Set<string>();
        const hot: Lead[] = [];
        for (const m of data as any[]) {
          if (hot.length >= 5) break;
          const text = String(m.content || "");
          const hit = HOT_PATTERNS.find(rx => rx.test(text));
          if (!hit) continue;
          const key = m.conversation_id || m.sender_id;
          if (seen.has(key)) continue;
          seen.add(key);
          hot.push({
            conversation_id: m.conversation_id,
            sender_id: m.sender_id,
            preview: text.slice(0, 140),
            created_at: m.created_at,
            matched: (text.match(hit) || [""])[0],
          });
        }

        if (hot.length > 0) {
          const ids = Array.from(new Set(hot.map(h => h.sender_id)));
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", ids)
            .then(r => r, () => ({ data: [] } as any));
          const byId = new Map((profs || []).map((p: any) => [p.user_id, p]));
          for (const h of hot) {
            const p: any = byId.get(h.sender_id);
            if (p) { h.sender_name = p.full_name; h.sender_avatar = p.avatar_url; }
          }
        }

        if (!cancelled) setLeads(hot);
      } catch {/* silent */}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || leads.length === 0) return null;

  return (
    <Card className="p-4 mb-4 border-[hsl(var(--signal-amber))]/30 bg-[hsl(var(--signal-amber))]/[0.04]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[hsl(var(--signal-amber))]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
            Hot leads
          </p>
          <Badge className="h-4 px-1.5 text-[10px] bg-[hsl(var(--signal-amber))] text-background">
            {leads.length}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">Last 14d · unread</span>
      </div>
      <div className="space-y-2">
        {leads.map((l, i) => (
          <button
            key={i}
            onClick={() => navigate(l.conversation_id ? `/messages?c=${l.conversation_id}` : `/messages?u=${l.sender_id}`)}
            className="w-full text-left rounded-xl border border-border bg-card hover:bg-muted/40 transition px-3 py-2.5 flex items-start gap-3"
          >
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={l.sender_avatar || undefined} />
              <AvatarFallback>{(l.sender_name || "?").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold truncate">
                  {l.sender_name || "New lead"}
                </span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-[hsl(var(--signal-amber))]/40 text-[hsl(var(--signal-amber))]">
                  {l.matched.toLowerCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{l.preview}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0">
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default HotLeadsStrip;
