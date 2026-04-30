import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Loader2,
  Link2,
  Check,
  Phone,
  Users,
  UserCircle2,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ringUsers } from "@/hooks/useIncomingCall";
import { APP_URL } from "@/lib/constants";

interface Person {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string | null;
  source: "project" | "connection" | "search";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required so we can ring the right people with the right context. */
  callContext: {
    kind: "project" | "direct";
    projectId?: string | null;
    projectName: string;
    directCallId?: string | null;
    roomUrl: string;
    roomName: string;
    callId?: string | null;
    callerName: string;
    callerAvatar?: string | null;
  };
}

const initials = (name: string | null | undefined) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Unified invite flow for an active video call.
 * Tabs: Project · Network · Search
 * Plus a one-tap Guest Link button (for clients/non-users).
 */
export const CallInviteSheet = ({ open, onOpenChange, callContext }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"project" | "network" | "search">(
    callContext.projectId ? "project" : "network",
  );
  const [projectMembers, setProjectMembers] = useState<Person[]>([]);
  const [connections, setConnections] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Map<string, Person>>(new Map());
  const [ringing, setRinging] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Reset state when reopening
  useEffect(() => {
    if (!open) {
      setSelected(new Map());
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Load project members
  useEffect(() => {
    if (!open || !callContext.projectId) return;
    (async () => {
      const { data: collabs } = await supabase
        .from("project_collaborators")
        .select("user_id")
        .eq("project_id", callContext.projectId)
        .eq("status", "accepted");
      const ids = (collabs || []).map((c) => c.user_id).filter(Boolean) as string[];
      if (!ids.length) {
        setProjectMembers([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", ids);
      setProjectMembers(
        (profiles || [])
          .filter((p) => p.user_id !== user?.id)
          .map((p) => ({ ...p, source: "project" as const })),
      );
    })().catch((e) => console.warn("[CallInviteSheet] members", e));
  }, [open, callContext.projectId, user?.id]);

  // Load connections
  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("connections")
        .select("user_id, connected_user_id")
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .eq("status", "accepted");
      const otherIds = new Set<string>();
      (data || []).forEach((c) => {
        otherIds.add(c.user_id === user.id ? c.connected_user_id : c.user_id);
      });
      if (!otherIds.size) {
        setConnections([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", Array.from(otherIds))
        .limit(200);
      setConnections(
        (profiles || []).map((p) => ({ ...p, source: "connection" as const })),
      );
    })().catch((e) => console.warn("[CallInviteSheet] connections", e));
  }, [open, user?.id]);

  // Search platform users (debounced)
  useEffect(() => {
    if (tab !== "search") return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role")
          .ilike("full_name", `%${q}%`)
          .neq("user_id", user?.id ?? "")
          .limit(20);
        setSearchResults(
          (data || []).map((p) => ({ ...p, source: "search" as const })),
        );
      } catch (e) {
        console.warn("[CallInviteSheet] search", e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, tab, user?.id]);

  const visible = useMemo(() => {
    if (tab === "project") return projectMembers;
    if (tab === "network") return connections;
    return searchResults;
  }, [tab, projectMembers, connections, searchResults]);

  const toggleSelect = (p: Person) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.user_id)) next.delete(p.user_id);
      else next.set(p.user_id, p);
      return next;
    });
  };

  const handleRing = async () => {
    if (selected.size === 0 || !user?.id) return;
    setRinging(true);
    try {
      const ids = Array.from(selected.keys());
      await ringUsers(ids, {
        kind: callContext.kind,
        projectId: callContext.projectId ?? undefined,
        projectName: callContext.projectName,
        callerId: user.id,
        callerName: callContext.callerName,
        callerAvatar: callContext.callerAvatar ?? null,
        roomUrl: callContext.roomUrl,
        roomName: callContext.roomName,
        callId: callContext.callId ?? null,
      });
      toast({
        title: `Ringing ${selected.size} ${selected.size === 1 ? "person" : "people"}…`,
        description: "They'll see an incoming call card.",
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Couldn't ring",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setRinging(false);
    }
  };

  const handleCopyGuestLink = async () => {
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-video-guest-link",
        {
          body: {
            project_id: callContext.projectId ?? null,
            direct_call_id: callContext.directCallId ?? null,
            room_name: callContext.roomName,
            room_url: callContext.roomUrl,
            guest_label: callContext.projectName,
          },
        },
      );
      if (error) throw error;
      const url = `${APP_URL}/call/${data.token}`;
      // Try native share first, fall back to clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Join "${callContext.projectName}" on ThriveIN`,
            text: `${callContext.callerName} is inviting you to a video call`,
            url,
          });
          toast({ title: "Invite shared" });
          return;
        } catch {
          // user cancelled share — fall through to clipboard
        }
      }
      await navigator.clipboard.writeText(url);
      toast({
        title: "Guest link copied",
        description: "Valid for 4 hours — paste it anywhere.",
      });
    } catch (e: any) {
      toast({
        title: "Couldn't create link",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingLink(false);
    }
  };

  const tabs: { id: typeof tab; label: string; icon: typeof Users; show: boolean }[] = [
    { id: "project", label: "Project", icon: Users, show: !!callContext.projectId },
    { id: "network", label: "Network", icon: UserCircle2, show: true },
    { id: "search", label: "Search", icon: Globe, show: true },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88dvh] p-0 flex flex-col bg-background gap-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0 text-left">
          <SheetTitle className="text-base font-semibold">Invite to call</SheetTitle>
          <p className="text-xs text-muted-foreground">{callContext.projectName}</p>
        </SheetHeader>

        {/* Guest link CTA */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyGuestLink}
            disabled={generatingLink}
            className="w-full h-11 rounded-full gap-2 justify-center"
          >
            {generatingLink ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            <span className="font-medium">Share guest link (4 hours)</span>
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Anyone with the link can join — perfect for clients
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0 overflow-x-auto">
          {tabs
            .filter((t) => t.show)
            .map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
        </div>

        {/* Search input (only shown on search tab) */}
        {tab === "search" && (
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people on ThriveIN…"
                className="pl-9 rounded-full h-10"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* People list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "search" && searchQuery.trim().length < 2 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 text-muted-foreground gap-2">
              <Search className="h-8 w-8 opacity-40" />
              <p className="text-sm">Type a name to search ThriveIN</p>
            </div>
          ) : searching ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 text-muted-foreground gap-2">
              <Users className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                {tab === "project"
                  ? "No other project members yet."
                  : tab === "network"
                    ? "You haven't connected with anyone yet."
                    : "No matches."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((p) => {
                const isSelected = selected.has(p.user_id);
                return (
                  <li key={p.user_id}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {initials(p.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.full_name || "Unnamed"}
                        </p>
                        {p.role && (
                          <p className="text-xs text-muted-foreground truncate">
                            {p.role}
                          </p>
                        )}
                      </div>
                      <span
                        className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Ring button */}
        {selected.size > 0 && (
          <div
            className="px-4 pt-3 border-t border-border shrink-0 bg-background"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <Button
              type="button"
              onClick={handleRing}
              disabled={ringing}
              className="w-full h-12 rounded-full gap-2 text-base font-semibold"
            >
              {ringing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
              Ring {selected.size} {selected.size === 1 ? "person" : "people"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
