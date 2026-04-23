import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Crown, UserPlus, Check, Users, Mail, X } from "lucide-react";
import { useProjectLimit } from "@/hooks/useProjectLimit";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_TYPE_LIST,
  DEAL_TYPE_LIST,
  type WorkspaceType,
  type DealType,
  WORKSPACE_CONFIGS,
  DEAL_CONFIGS,
} from "@/lib/workspaceConfigs";
import { recommendWorkspaces } from "@/lib/workspaceRecommendations";
import { Sparkles } from "lucide-react";

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

interface InvitedPerson {
  user_id?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  email?: string;
  agent_role?: "manager" | "client" | "creative";
}

export function CreateProjectWizard({ open, onOpenChange, onSuccess }: CreateProjectWizardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canCreateProject, limit, isPro, loading: limitLoading } = useProjectLimit();

  const [step, setStep] = useState<Step>(1);
  const [creating, setCreating] = useState(false);

  // Step 1
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType | null>(null);
  // Step 2
  const [dealType, setDealType] = useState<DealType | null>(null);
  // Step 3
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [invited, setInvited] = useState<InvitedPerson[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<WorkspaceType[]>([]);
  // Agent-mode role being assigned to the next pick
  const [pendingAgentRole, setPendingAgentRole] = useState<"client" | "creative">("client");

  const isAgent = dealType === "agent_brokered";

  useEffect(() => {
    if (open) {
      void loadConnections();
      void loadRecommendations();
    } else {
      // Reset on close
      setStep(1);
      setWorkspaceType(null);
      setDealType(null);
      setTitle("");
      setDescription("");
      setInvited([]);
      setInviteSearch("");
      setShowInviteDropdown(false);
      setPendingAgentRole("client");
    }
  }, [open]);

  const loadConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: outgoing } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      const { data: incoming } = await supabase
        .from("connections")
        .select("user_id")
        .eq("connected_user_id", user.id)
        .eq("status", "accepted");
      const ids = new Set<string>();
      outgoing?.forEach((c) => ids.add(c.connected_user_id));
      incoming?.forEach((c) => ids.add(c.user_id));
      if (ids.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role")
          .in("user_id", Array.from(ids));
        setConnections(profiles || []);
      }
    } catch (e) {
      console.error("loadConnections", e);
    }
  };

  const loadRecommendations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, sub_roles")
        .eq("user_id", user.id)
        .maybeSingle();
      const roleSignal = [profile?.role, ...((profile as any)?.sub_roles ?? [])].filter(Boolean).join(" ");
      setRecommended(recommendWorkspaces(roleSignal));
    } catch (e) {
      console.error("loadRecommendations", e);
    }
  };

    const q = inviteSearch.toLowerCase();
    if (!q) return true;
    return (u.full_name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q));
  }).filter((u) => !invited.some((i) => i.user_id === u.user_id));

  const isEmail = inviteSearch.includes("@") && inviteSearch.includes(".");

  const addInvitedFromConnection = (u: any) => {
    setInvited([...invited, {
      user_id: u.user_id,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      role: u.role,
      agent_role: isAgent ? pendingAgentRole : undefined,
    }]);
    setInviteSearch("");
    setShowInviteDropdown(false);
  };

  const addInvitedFromEmail = () => {
    if (!isEmail) return;
    setInvited([...invited, {
      email: inviteSearch.trim().toLowerCase(),
      agent_role: isAgent ? pendingAgentRole : undefined,
    }]);
    setInviteSearch("");
    setShowInviteDropdown(false);
  };

  const removeInvited = (idx: number) => {
    setInvited(invited.filter((_, i) => i !== idx));
  };

  const canAdvance = () => {
    if (step === 1) return !!workspaceType;
    if (step === 2) return !!dealType;
    if (step === 3) {
      if (!title.trim()) return false;
      if (isAgent) {
        const hasClient = invited.some((i) => i.agent_role === "client");
        const hasCreative = invited.some((i) => i.agent_role === "creative");
        return hasClient && hasCreative;
      }
      return true;
    }
    return false;
  };

  const handleCreate = async () => {
    if (!workspaceType || !dealType || !title.trim()) return;
    try {
      setCreating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const clientUser = invited.find((i) => i.agent_role === "client" && i.user_id);
      const creativeUserIds = invited
        .filter((i) => i.agent_role === "creative" && i.user_id)
        .map((i) => i.user_id!);

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          created_by: user.id,
          status: "active" as const,
          workspace_type: workspaceType,
          deal_type: dealType,
          agent_mode: isAgent,
          agent_user_id: isAgent ? user.id : null,
          client_user_id: clientUser?.user_id ?? null,
          creative_user_ids: creativeUserIds.length > 0 ? creativeUserIds : null,
          setup_completed: false,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      try {
        const { analytics } = await import("@/lib/analytics");
        analytics.projectCreated(project.id);
      } catch { /* non-fatal */ }

      // Get inviter profile for emails
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      // Send invites
      for (const person of invited) {
        try {
          if (person.user_id) {
            await supabase.from("project_collaborators").insert({
              project_id: project.id,
              user_id: person.user_id,
              email: person.email || `user-${person.user_id}@platform.invite`,
              invited_by: user.id,
              role: "member",
              status: "pending",
              agent_role: person.agent_role ?? null,
            });
            // Optional notification
            await supabase.functions.invoke("send-project-invitation", {
              body: {
                email: person.email || null,
                projectTitle: title.trim(),
                projectId: project.id,
                inviterName: userProfile?.full_name || "A ThriveIN user",
                inviteeUserId: person.user_id,
              },
            }).catch(() => {});
          } else if (person.email) {
            await supabase.from("project_collaborators").insert({
              project_id: project.id,
              email: person.email,
              invited_by: user.id,
              role: "member",
              status: "pending",
              agent_role: person.agent_role ?? null,
            });
            await supabase.functions.invoke("send-project-invitation", {
              body: {
                email: person.email,
                projectTitle: title.trim(),
                projectId: project.id,
                inviterName: userProfile?.full_name || "A ThriveIN user",
              },
            }).catch(() => {});
          }
        } catch (e) {
          console.error("invite failed", e);
        }
      }

      toast({
        title: "Workspace ready",
        description: `${WORKSPACE_CONFIGS[workspaceType].label} desk created.`,
      });

      onSuccess();
      onOpenChange(false);
      setTimeout(() => navigate(`/desk/${project.id}`), 100);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Failed to create workspace",
        description: e.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // ---- Render ----
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {step === 1 && "What are you making?"}
              {step === 2 && "How does money flow?"}
              {step === 3 && "Last bit — name it & invite people"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Step {step} of 3 · Tailoring the desk to your workflow
          </DialogDescription>
          {/* progress */}
          <div className="flex gap-1 pt-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </DialogHeader>

        {!canCreateProject && !isPro && !limitLoading ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">Monthly Limit Reached</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Free accounts can create {limit} project per month. Upgrade for unlimited workspaces.
              </p>
            </div>
            <Button
              onClick={() => { onOpenChange(false); navigate("/subscription"); }}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold gap-2"
            >
              <Crown className="h-4 w-4" /> Upgrade to Pro
            </Button>
          </div>
        ) : (
          <>
            {/* STEP 1: Workspace type */}
            {step === 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
                {WORKSPACE_TYPE_LIST.map((wc) => {
                  const Icon = wc.icon;
                  const selected = workspaceType === wc.id;
                  return (
                    <button
                      key={wc.id}
                      onClick={() => setWorkspaceType(wc.id)}
                      className={cn(
                        "group relative text-left p-3 rounded-xl border-2 transition-all",
                        "hover:border-primary/60 hover:bg-primary/5",
                        selected ? "border-primary bg-primary/10" : "border-border bg-card",
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="font-semibold text-sm leading-tight">{wc.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{wc.description}</div>
                      {selected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* STEP 2: Deal type */}
            {step === 2 && (
              <div className="space-y-2 py-2">
                {DEAL_TYPE_LIST.map((dc) => {
                  const Icon = dc.icon;
                  const selected = dealType === dc.id;
                  return (
                    <button
                      key={dc.id}
                      onClick={() => setDealType(dc.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                        "hover:border-primary/60 hover:bg-primary/5",
                        selected ? "border-primary bg-primary/10" : "border-border bg-card",
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{dc.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{dc.description}</div>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
                {dealType === "agent_brokered" && (
                  <div className="p-3 rounded-lg border border-accent/40 bg-accent/5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Agent Mode:</span> You'll be the manager. Client and creative each see their own side only — pricing and margins stay private to you. Configure rates after creation.
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Name + invite */}
            {step === 3 && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-semibold">Workspace name</Label>
                  <Input
                    id="title"
                    placeholder={
                      workspaceType === "music_project" ? "e.g. Summer EP — Track 3" :
                      workspaceType === "photo_shoot" ? "e.g. Vogue Editorial — June" :
                      workspaceType === "video_shoot" ? "e.g. Music Video — 'Reckless'" :
                      "Give this workspace a name"
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-base font-semibold">
                    Quick description <span className="text-muted-foreground font-normal text-sm">(optional)</span>
                  </Label>
                  <Textarea
                    id="desc"
                    placeholder="What's the vibe? Who's it for? Anything that helps Thrive Ops set things up."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Agent role picker */}
                {isAgent && (
                  <div className="flex gap-2 p-1 rounded-lg bg-muted">
                    <button
                      onClick={() => setPendingAgentRole("client")}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                        pendingAgentRole === "client" ? "bg-card shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Adding Client
                    </button>
                    <button
                      onClick={() => setPendingAgentRole("creative")}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                        pendingAgentRole === "creative" ? "bg-card shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Adding Creative
                    </button>
                  </div>
                )}

                {/* Invite */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {isAgent ? `Invite ${pendingAgentRole}` : "Invite people"}
                    <span className="text-muted-foreground font-normal text-sm">
                      {isAgent ? "(required: 1 client + 1 creative)" : "(optional)"}
                    </span>
                  </Label>

                  <div className="relative">
                    <Input
                      placeholder="Search your network or type an email"
                      value={inviteSearch}
                      onChange={(e) => { setInviteSearch(e.target.value); setShowInviteDropdown(true); }}
                      onFocus={() => setShowInviteDropdown(true)}
                      className="h-11"
                    />
                    {showInviteDropdown && inviteSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
                        <ScrollArea className="max-h-[220px]">
                          {filteredConnections.length > 0 && (
                            <div className="p-2 space-y-1">
                              <div className="px-2 py-1 flex items-center gap-2">
                                <Users className="h-3 w-3 text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">From your network</span>
                              </div>
                              {filteredConnections.slice(0, 6).map((u) => (
                                <button
                                  key={u.user_id}
                                  onClick={() => addInvitedFromConnection(u)}
                                  className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg text-left"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.avatar_url} />
                                    <AvatarFallback className="text-xs">{u.full_name?.[0] || "U"}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{u.full_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{u.role}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {isEmail && (
                            <div className="p-2 border-t">
                              <button
                                onClick={addInvitedFromEmail}
                                className="w-full flex items-center gap-3 p-2 border-2 border-dashed rounded-lg hover:bg-accent text-left"
                              >
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{inviteSearch}</p>
                                  <p className="text-xs text-muted-foreground">Invite by email</p>
                                </div>
                              </button>
                            </div>
                          )}
                          {filteredConnections.length === 0 && !isEmail && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No matches. Type a full email to invite.
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    )}
                  </div>

                  {/* Invited list */}
                  {invited.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {invited.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {(p.full_name || p.email || "U")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{p.full_name || p.email}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.agent_role ? <span className="capitalize text-primary font-medium">{p.agent_role} · </span> : null}
                              {p.role || (p.user_id ? "From your network" : "Email invite")}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeInvited(i)} className="h-7 w-7">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => step > 1 ? setStep((step - 1) as Step) : onOpenChange(false)}
                disabled={creating}
              >
                {step > 1 ? <><ArrowLeft className="h-4 w-4 mr-1" /> Back</> : "Cancel"}
              </Button>

              {step < 3 ? (
                <Button
                  onClick={() => setStep((step + 1) as Step)}
                  disabled={!canAdvance()}
                  className="gap-1"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={!canAdvance() || creating}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold gap-2"
                >
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <>Create workspace</>}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
