import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles, FileText, Folder, MessageCircle, UserPlus, ShieldCheck, Target, Send, Link2, Download, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const STORAGE_KEY = (token: string) => `guest_studio:${token}`;

interface ProjectInfo {
  project_id: string;
  title: string;
  description: string | null;
  workspace_type: string | null;
  status: string | null;
  created_by: string;
  client_name: string | null;
  cover_url: string | null;
}

export default function GuestStudio() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"brief" | "drop" | "vault" | "chat">("brief");

  // Drop / Vault / Roster data
  const [files, setFiles] = useState<any[]>([]);
  const [pulse, setPulse] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [dropText, setDropText] = useState("");
  const [dropping, setDropping] = useState(false);

  const loadGuestData = useCallback(async () => {
    if (!token) return;
    try {
      const [{ data: f }, { data: p }, { data: r }] = await Promise.all([
        supabase.rpc("get_guest_files", { _token: token }),
        supabase.rpc("get_guest_pulse", { _token: token }),
        supabase.rpc("get_guest_collaborators", { _token: token }),
      ]);
      setFiles(f || []);
      setPulse(p || []);
      setRoster(r || []);
    } catch (e) {
      console.warn("[guest-studio] data load failed", e);
    }
  }, [token]);

  // Resolve token → project
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .rpc("get_project_for_guest", { _token: token })
          .maybeSingle();
        if (!active) return;
        if (error || !data) {
          setProject(null);
          setLoading(false);
          return;
        }
        setProject(data as ProjectInfo);

        const cached = localStorage.getItem(STORAGE_KEY(token));
        if (cached) {
          const parsed = JSON.parse(cached);
          setName(parsed.name || "");
          setEmail(parsed.email || "");
          await supabase.rpc("register_guest_session", {
            _token: token,
            _name: parsed.name,
            _email: parsed.email,
          });
        } else {
          setNeedsName(true);
        }
      } catch (e) {
        console.warn("[guest-studio] load failed", e);
        if (active) setProject(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handleEnter = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email needed", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("register_guest_session", {
        _token: token,
        _name: name.trim(),
        _email: email.trim(),
      });
      if (error) throw error;
      localStorage.setItem(
        STORAGE_KEY(token),
        JSON.stringify({ name: name.trim(), email: email.trim() }),
      );
      setNeedsName(false);
    } catch (e: any) {
      toast({ title: "Couldn't continue", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
        <h1 className="text-xl font-bold">Link expired or invalid</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Ask your collaborator to send you a fresh Studio link.
        </p>
        <Button className="mt-5" onClick={() => navigate("/")}>Go to ThriveIN</Button>
      </div>
    );
  }

  if (needsName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold">Welcome to {project.title}</h1>
              <p className="text-xs text-muted-foreground">
                Quick intro so the team knows who's in the room.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-name">Your name</Label>
              <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-email">Email</Label>
              <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
            </div>
            <Button className="w-full" onClick={handleEnter} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter the Studio"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              No password. Bookmark this link to come back.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header
        className="relative h-32 px-4 flex items-end pb-3"
        style={{
          backgroundImage: project.cover_url
            ? `linear-gradient(180deg, hsl(var(--background)/0.2), hsl(var(--background)/0.95)), url(${project.cover_url})`
            : `linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--accent)/0.2))`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Guest Studio · {project.workspace_type ?? "Project"}
          </p>
          <h1 className="text-xl font-black tracking-tight">{project.title}</h1>
          {name && <p className="text-[11px] text-muted-foreground">Hey {name.split(" ")[0]} 👋</p>}
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex gap-1 px-2">
        {[
          { id: "brief", label: "Brief", Icon: FileText },
          { id: "vault", label: "Vault", Icon: Folder },
          { id: "chat", label: "Chat", Icon: MessageCircle },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <main className="px-4 py-5 space-y-4">
        {tab === "brief" && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold">The Brief</h2>
              {project.description ? (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {project.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  The team is still putting the brief together.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "vault" && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-bold">The Vault</h2>
              <p className="text-sm text-muted-foreground">
                Files and approvals will appear here as the team drops them.
              </p>
              <p className="text-[11px] text-muted-foreground italic pt-2">
                Coming next: live file list + one-tap approval.
              </p>
            </CardContent>
          </Card>
        )}

        {tab === "chat" && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-bold">Chat</h2>
              <p className="text-sm text-muted-foreground">
                Real-time room chat with the team — wired up next.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Persistent Claim CTA */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-card/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Claim your profile</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Get the full ThriveIN — projects, payments, your creative resume.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({
                email,
                name,
                redirect: `/guest/${token}`,
              });
              navigate(`/auth?${params.toString()}`);
            }}
            className="shrink-0 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold"
          >
            Claim
          </Button>
        </div>
      </div>
    </div>
  );
}
