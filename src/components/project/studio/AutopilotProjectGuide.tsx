/**
 * AutopilotProjectGuide — Section 10 of the Global Typography, UX/UI and
 * AI-Powered Motion Overhaul.
 *
 * A guided, human-paced walkthrough for setting up a project — not an
 * autonomous agent. Kreto suggests at each step; the person reviews, edits
 * and explicitly confirms every write. Nothing here ever auto-submits,
 * auto-emails, auto-pays, auto-invites or auto-publishes: every action
 * that touches real data (an invite, a milestone, a saved brief, a
 * created task, a proposal) fires from its own explicit button click, not
 * from advancing a step or opening the panel.
 *
 * Eight steps: define project → add collaborators → milestones → AI
 * brief → review tasks → confirm plan → prepare next action →
 * complete/pause. The one deliberately deferred action is task creation —
 * AI-suggested tasks are reviewed and can be unchecked in step 5, and
 * only become real project_tasks rows after the read-only "confirm plan"
 * screen (step 6), together with a single proposed next action inserted
 * as a pending agent_proposals row — never executed automatically, and
 * rendered through the same ProactiveCards "Kreto Suggests" surface every
 * other AI proposal in Studio goes through.
 */
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Sparkles, UserPlus, Flag,
  FileText, ListChecks, ClipboardCheck, Rocket, PauseCircle, X,
} from "lucide-react";

type StepId =
  | "define" | "collaborators" | "milestones" | "brief"
  | "tasks" | "confirm" | "next_action" | "complete";

const STEPS: { id: StepId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "define", label: "Define the project", icon: FileText },
  { id: "collaborators", label: "Add collaborators", icon: UserPlus },
  { id: "milestones", label: "Set milestones", icon: Flag },
  { id: "brief", label: "Draft an AI brief", icon: Sparkles },
  { id: "tasks", label: "Review suggested tasks", icon: ListChecks },
  { id: "confirm", label: "Confirm the plan", icon: ClipboardCheck },
  { id: "next_action", label: "Prepare next action", icon: Rocket },
  { id: "complete", label: "Complete or pause", icon: PauseCircle },
];

interface SuggestedTask {
  title: string;
  description?: string | null;
  accepted: boolean;
}

interface Props {
  project: { id: string; title: string; description: string | null; created_by: string; client_user_id?: string | null; client_name?: string | null };
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function AutopilotProjectGuide({ project, currentUserId, open, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex].id;

  // Step 1 — define
  const [title, setTitle] = useState(project.title || "");
  const [description, setDescription] = useState(project.description || "");
  const [savingDefine, setSavingDefine] = useState(false);
  const [defineSaved, setDefineSaved] = useState(false);

  // Step 2 — collaborators
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [inviteInput, setInviteInput] = useState("");
  const [inviting, setInviting] = useState(false);

  // Step 3 — milestones
  const [milestones, setMilestones] = useState<any[]>([]);
  const [msTitle, setMsTitle] = useState("");
  const [msAmount, setMsAmount] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);

  // Step 4 — AI brief
  const [briefDraft, setBriefDraft] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefSaved, setBriefSaved] = useState(false);
  const [savingBrief, setSavingBrief] = useState(false);

  // Step 5 — suggested tasks (deferred — nothing written until step 7)
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Step 7 — prepare next action
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState<{ tasksCreated: number; proposalTitle: string } | null>(null);

  // Step 8 — complete/pause
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setDefineSaved(false);
    setBriefSaved(false);
    setPrepared(null);
    void loadCollaborators();
    void loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project.id]);

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from("project_collaborators")
      .select("id, user_id, email, status, agent_role, profiles:user_id(full_name, avatar_url)")
      .eq("project_id", project.id);
    setCollaborators(data || []);
  };

  const loadMilestones = async () => {
    const { data } = await supabase
      .from("milestones")
      .select("id, title, amount, status")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });
    setMilestones(data || []);
  };

  const goNext = () => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  // ---- Step 1: define ----
  const saveDefine = async () => {
    if (!title.trim()) return;
    setSavingDefine(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ title: title.trim(), description: description.trim() || null })
        .eq("id", project.id);
      if (error) throw error;
      setDefineSaved(true);
      onUpdated();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setSavingDefine(false);
    }
  };

  // ---- Step 2: collaborators — each invite is its own explicit, immediate action ----
  const isEmail = inviteInput.includes("@") && inviteInput.includes(".");
  const sendInvite = async () => {
    if (!isEmail || inviting) return;
    setInviting(true);
    try {
      const email = inviteInput.trim().toLowerCase();
      const { error } = await supabase.from("project_collaborators").insert({
        project_id: project.id,
        email,
        invited_by: currentUserId,
        role: "member",
        status: "pending",
      });
      if (error) throw error;
      await supabase.functions.invoke("send-project-invitation", {
        body: { email, projectId: project.id },
      }).catch(() => {});
      setInviteInput("");
      await loadCollaborators();
      toast({ title: "Invite sent", description: email });
    } catch (e: any) {
      toast({ title: "Couldn't invite", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  // ---- Step 3: milestones — plain planning record, no escrow/payment triggered ----
  const addMilestone = async () => {
    if (!msTitle.trim() || addingMilestone) return;
    setAddingMilestone(true);
    try {
      const { error } = await supabase.from("milestones").insert({
        project_id: project.id,
        created_by: currentUserId,
        title: msTitle.trim(),
        amount: Number(msAmount) || 0,
        status: "pending",
        escrow_status: "none",
      });
      if (error) throw error;
      setMsTitle("");
      setMsAmount("");
      await loadMilestones();
    } catch (e: any) {
      toast({ title: "Couldn't add milestone", description: e.message, variant: "destructive" });
    } finally {
      setAddingMilestone(false);
    }
  };

  // ---- Step 4: AI brief — generate (no write) → edit → explicit save ----
  const generateBrief = async () => {
    setBriefLoading(true);
    try {
      const source = [title, description].filter(Boolean).join(" — ");
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { source: "text", text: source || title },
      });
      if (error) throw error;
      const result: any = data ?? {};
      setBriefDraft(result?.project?.summary || "");
      if (Array.isArray(result?.deliverables) && result.deliverables.length) {
        setSuggestedTasks(
          result.deliverables.slice(0, 8).map((d: any) => ({
            title: String(d.title || "").slice(0, 200),
            description: d.description ?? null,
            accepted: true,
          })),
        );
      }
    } catch (e: any) {
      toast({ title: "Couldn't draft a brief", description: e.message, variant: "destructive" });
    } finally {
      setBriefLoading(false);
    }
  };

  const saveBrief = async () => {
    if (!briefDraft.trim()) return;
    setSavingBrief(true);
    try {
      const { error } = await supabase.from("projects").update({ description: briefDraft.trim() }).eq("id", project.id);
      if (error) throw error;
      setDescription(briefDraft.trim());
      setBriefSaved(true);
      onUpdated();
    } catch (e: any) {
      toast({ title: "Couldn't save brief", description: e.message, variant: "destructive" });
    } finally {
      setSavingBrief(false);
    }
  };

  // ---- Step 5: tasks stay local (accepted flags) until step 7 ----
  const toggleTask = (i: number) => {
    setSuggestedTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, accepted: !t.accepted } : t)));
  };

  // ---- Step 7: the one execution point — create accepted tasks + one proposal, nothing more ----
  const prepareNextAction = async () => {
    setPreparing(true);
    try {
      const accepted = suggestedTasks.filter((t) => t.accepted);
      if (accepted.length > 0) {
        const { error: taskError } = await supabase.from("project_tasks").insert(
          accepted.map((t) => ({
            project_id: project.id,
            title: t.title,
            description: t.description ?? null,
            status: "todo" as const,
            created_by: currentUserId,
          })),
        );
        if (taskError) throw taskError;
      }

      // Context-sensitive but simple: suggest whichever setup gap is most
      // useful next — never more than one proposal, never auto-executed.
      let kind: "collab_nudge" | "next_milestone" | "other" = "other";
      let proposalTitle = "Start on the first task";
      let body = "The plan is set — open Tasks and get moving on the first item.";
      if (collaborators.length === 0) {
        kind = "collab_nudge";
        proposalTitle = "Invite a collaborator";
        body = "This project doesn't have anyone else on it yet. Bring in a collaborator when you're ready.";
      } else if (milestones.length === 0) {
        kind = "next_milestone";
        proposalTitle = "Set your first milestone";
        body = "No milestones yet — adding one gives the project a clear next checkpoint.";
      }

      // agent_proposals has no client INSERT policy (service_role only, by
      // design — see create-agent-proposal) so this goes through the one
      // narrow, ownership-checked edge function rather than a direct write.
      const { error: proposalError } = await supabase.functions.invoke("create-agent-proposal", {
        body: {
          project_id: project.id,
          kind,
          title: proposalTitle,
          proposal_body: body,
          action_intent: { href: `/desk/${project.id}` },
          source_signal: { source: "autopilot_project_guide" },
        },
      });
      if (proposalError) throw proposalError;

      setPrepared({ tasksCreated: accepted.length, proposalTitle });
      onUpdated();
    } catch (e: any) {
      toast({ title: "Couldn't prepare next action", description: e.message, variant: "destructive" });
    } finally {
      setPreparing(false);
    }
  };

  // ---- Step 8: complete or pause ----
  const finalize = async (markComplete: boolean) => {
    setFinalizing(true);
    try {
      if (markComplete) {
        const { error } = await supabase.from("projects").update({ setup_completed: true }).eq("id", project.id);
        if (error) throw error;
        onUpdated();
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Couldn't update project", description: e.message, variant: "destructive" });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Autopilot — {STEPS[stepIndex].label}
          </SheetTitle>
          <SheetDescription>
            Step {stepIndex + 1} of {STEPS.length} · Kreto suggests, you confirm every step
          </SheetDescription>
          <div className="flex gap-1 pt-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className={cn("h-1 flex-1 rounded-full transition-colors", i <= stepIndex ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {step === "define" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Project name</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" />
              </div>
              <Button onClick={saveDefine} disabled={!title.trim() || savingDefine} size="sm" className="gap-1.5">
                {savingDefine ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
              {defineSaved && <p className="text-xs text-muted-foreground">Saved to the project.</p>}
            </div>
          )}

          {step === "collaborators" && (
            <div className="space-y-3">
              {collaborators.length > 0 && (
                <div className="space-y-1.5">
                  {collaborators.map((c) => (
                    <div key={c.id} className="flex items-center gap-2.5 rounded-lg border p-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={c.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">{(c.profiles?.full_name || c.email || "U")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.profiles?.full_name || c.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{c.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Email to invite"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                />
                <Button onClick={sendInvite} disabled={!isEmail || inviting} size="sm" className="shrink-0 gap-1.5">
                  {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Invite
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Each invite sends immediately when you click Invite — Autopilot never sends one on its own. Optional — skip if no one else is on this yet.
              </p>
            </div>
          )}

          {step === "milestones" && (
            <div className="space-y-3">
              {milestones.length > 0 && (
                <div className="space-y-1.5">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                      <span className="truncate">{m.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{m.amount ? `$${m.amount}` : "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Input placeholder="Milestone name" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder="Amount (optional)" type="number" value={msAmount} onChange={(e) => setMsAmount(e.target.value)} />
                  <Button onClick={addMilestone} disabled={!msTitle.trim() || addingMilestone} size="sm" className="shrink-0 gap-1.5">
                    {addingMilestone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A planning record only — no escrow or payment is triggered here. Optional — skip and add milestones later.
              </p>
            </div>
          )}

          {step === "brief" && (
            <div className="space-y-3">
              {!briefDraft && (
                <Button onClick={generateBrief} disabled={briefLoading} size="sm" variant="secondary" className="gap-1.5">
                  {briefLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {briefLoading ? "Analyzing your project context…" : "Draft a brief with Kreto"}
                </Button>
              )}
              {briefLoading && (
                <p className="text-xs text-muted-foreground">Finding the shape of the project from what's saved so far.</p>
              )}
              {briefDraft && (
                <>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" /> Draft ready for review — edit anything
                    </Label>
                    <Textarea rows={5} value={briefDraft} onChange={(e) => { setBriefDraft(e.target.value); setBriefSaved(false); }} className="resize-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={saveBrief} disabled={savingBrief || briefSaved} size="sm" className="gap-1.5">
                      {savingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {briefSaved ? "Saved" : "Save to project"}
                    </Button>
                    <Button onClick={generateBrief} disabled={briefLoading} size="sm" variant="ghost">Regenerate</Button>
                  </div>
                  {!briefSaved && <p className="text-xs text-muted-foreground">Nothing was published yet — save when you're happy with it, or edit first.</p>}
                </>
              )}
            </div>
          )}

          {step === "tasks" && (
            <div className="space-y-3">
              {suggestedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No suggested tasks yet — draft a brief in the previous step to generate some, or skip ahead.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Kreto found {suggestedTasks.length} possible starter task{suggestedTasks.length === 1 ? "" : "s"} from the brief. Uncheck anything that doesn't belong — nothing is created until you confirm the plan.
                  </p>
                  <div className="space-y-1.5">
                    {suggestedTasks.map((t, i) => (
                      <label key={i} className="flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer">
                        <Checkbox checked={t.accepted} onCheckedChange={() => toggleTask(i)} className="mt-0.5" />
                        <span className="text-sm leading-snug">{t.title}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Review before Kreto prepares anything — this is a summary, nothing is created by viewing it.</p>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Project</p>
                  <p className="font-medium">{title || project.title}</p>
                  {description && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-3">{description}</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Collaborators</p>
                  <p className="text-muted-foreground">{collaborators.length === 0 ? "None yet" : collaborators.map((c) => c.profiles?.full_name || c.email).join(", ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Milestones</p>
                  <p className="text-muted-foreground">{milestones.length === 0 ? "None yet" : `${milestones.length} set`}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tasks about to be created</p>
                  <p className="text-muted-foreground">
                    {suggestedTasks.filter((t) => t.accepted).length === 0 ? "None — nothing will be created" : `${suggestedTasks.filter((t) => t.accepted).length} task(s)`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "next_action" && (
            <div className="space-y-3">
              {!prepared ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    This creates the tasks you accepted and prepares one suggested next step — it won't send, publish or execute anything on its own.
                  </p>
                  <Button onClick={prepareNextAction} disabled={preparing} size="sm" className="gap-1.5">
                    {preparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                    {preparing ? "Preparing…" : "Prepare next action"}
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                  <p className="text-sm font-medium">
                    {prepared.tasksCreated > 0 ? `${prepared.tasksCreated} task${prepared.tasksCreated === 1 ? "" : "s"} added.` : "No tasks were created."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A suggestion — "{prepared.proposalTitle}" — is waiting in Studio for you to review. Nothing was sent, published or executed.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Setup is either done, or pick up where you left off later — nothing here is a one-way door.</p>
              <div className="flex gap-2">
                <Button onClick={() => finalize(true)} disabled={finalizing} size="sm" className="gap-1.5">
                  {finalizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Mark setup complete
                </Button>
                <Button onClick={() => finalize(false)} disabled={finalizing} size="sm" variant="ghost" className="gap-1.5">
                  <PauseCircle className="h-3.5 w-3.5" /> Pause — continue later
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Nothing was published or sent without your confirmation at every step.</p>
            </div>
          )}
        </div>

        {step !== "complete" && (
          <div className="flex items-center justify-between pt-3 border-t">
            <Button variant="ghost" size="sm" onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack} className="gap-1">
              {stepIndex === 0 ? <><X className="h-3.5 w-3.5" /> Close</> : <><ArrowLeft className="h-3.5 w-3.5" /> Back</>}
            </Button>
            {step === "next_action" ? (
              prepared && (
                <Button size="sm" onClick={goNext} className="gap-1">Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
              )
            ) : (
              <Button size="sm" onClick={goNext} className="gap-1">Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default AutopilotProjectGuide;
