import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, Send, Loader2, X, Mic, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProjectOption {
  id: string;
  title: string;
}

interface AgentAction {
  tool: string;
  ok: boolean;
  args: any;
  result: any;
}

interface AgentResponse {
  reply: string;
  actions?: AgentAction[];
  error?: string;
}

const QUICK_PROMPTS = [
  "Summarize where this project stands",
  "Add task: send draft tomorrow",
  "Tell the team I'll send the brief by EOD",
  "What's overdue?",
];

export const ThriveAgentFab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [lastResult, setLastResult] = useState<AgentResponse | null>(null);

  // Detect project_id from /desk/:projectId
  const routeProjectId = (() => {
    const m = location.pathname.match(/^\/desk\/([0-9a-f-]{36})/i);
    return m?.[1] || null;
  })();

  // Only show on individual project pages — the /desk list page already has
  // the voice "create new project" FAB, and stacking two sparkles+mic FABs
  // creates visual collision (see screenshot bug 2026-05-01).
  const onProjectPage = !!routeProjectId;

  useEffect(() => {
    if (routeProjectId) setActiveProjectId(routeProjectId);
  }, [routeProjectId]);

  // Load projects list when sheet opens without a route project
  useEffect(() => {
    if (!open || !user || routeProjectId) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title")
        .or(`created_by.eq.${user.id},client_user_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })
        .limit(20);
      setProjects(data || []);
      if (!activeProjectId && data?.[0]) setActiveProjectId(data[0].id);
    })().catch(() => {});
  }, [open, user, routeProjectId, activeProjectId]);

  const send = useCallback(
    async (msg?: string) => {
      const message = (msg ?? text).trim();
      if (!message || sending) return;
      if (!activeProjectId) {
        toast.error("Pick a project first");
        return;
      }
      setSending(true);
      setLastResult(null);
      try {
        const { data, error } = await supabase.functions.invoke("desk-agent", {
          body: { project_id: activeProjectId, message },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);

        const resp = data as AgentResponse;
        setLastResult(resp);
        setText("");

        // Toast-style summary
        const firstAction = resp.actions?.[0];
        if (firstAction?.ok && firstAction.tool !== "ask_clarification") {
          toast.success(resp.reply, { duration: 4000 });
          // Auto-close on successful action
          setTimeout(() => setOpen(false), 1200);
        } else if (firstAction?.tool === "ask_clarification") {
          // Keep open for follow-up
        } else if (!resp.actions?.length) {
          toast(resp.reply, { duration: 4000 });
        }
      } catch (e: any) {
        toast.error(e.message || "Agent error");
      } finally {
        setSending(false);
      }
    },
    [text, sending, activeProjectId],
  );

  if (!user || !onDeskRoute) return null;

  return (
    <>
      {/* Floating button — sits above bottom nav */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Thrive Agent"
        className={cn(
          "fixed right-4 z-40 h-14 w-14 rounded-full shadow-xl",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
          "flex items-center justify-center active:scale-95 transition-transform",
          "bottom-[calc(env(safe-area-inset-bottom)+5rem)]",
        )}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-border p-0 max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Thrive Agent
            </SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-8 pt-2 space-y-4">
            {/* Project picker (only when not on a project page) */}
            {!routeProjectId && projects.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Project
                </label>
                <Select
                  value={activeProjectId || undefined}
                  onValueChange={setActiveProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Composer */}
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder='Tell the agent what to do… e.g. "Add task: edit reel by Friday"'
                rows={3}
                className="resize-none text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1"
                  onClick={() => send()}
                  disabled={!text.trim() || sending || !activeProjectId}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Run
                </Button>
              </div>
            </div>

            {/* Quick prompts */}
            {!lastResult && !sending && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Try
                </div>
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    disabled={sending || !activeProjectId}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <MessageSquare className="h-3 w-3 text-primary shrink-0" />
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Result card */}
            {lastResult && (
              <div className="rounded-xl border border-border bg-accent/40 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {lastResult.actions?.[0]?.ok !== false ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm leading-snug">{lastResult.reply}</div>
                </div>
                {lastResult.actions && lastResult.actions.length > 0 && (
                  <div className="text-[10px] text-muted-foreground pl-6">
                    {lastResult.actions
                      .map((a) => a.tool.replace(/_/g, " "))
                      .join(" → ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
