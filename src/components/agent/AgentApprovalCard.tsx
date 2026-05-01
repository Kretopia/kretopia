import { useState } from "react";
import { Check, X, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { decideAgentAction, type OrchAction } from "@/lib/agentOrchestrator";

interface Props {
  action: OrchAction;
  onResolved?: (status: "approved" | "rejected", result?: unknown) => void;
  compact?: boolean;
}

/**
 * Renders a proposed agent action with Approve / Dismiss controls.
 * Used wherever the orchestrator has queued up a Level-2 (requires_approval) action.
 */
export const AgentApprovalCard = ({ action, onResolved, compact }: Props) => {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();

  if (action.status !== "proposed") return null;

  const handle = async (decision: "approved" | "rejected") => {
    setBusy(decision === "approved" ? "approve" : "reject");
    try {
      const res = await decideAgentAction(action.id, decision);
      if (!res.ok && decision === "approved") {
        toast({
          title: "Couldn't run that",
          description: res.error ?? "The agent action failed.",
          variant: "destructive",
        });
      } else if (decision === "approved") {
        toast({ title: "Done", description: action.preview_title ?? "Action completed." });
      }
      onResolved?.(decision, res.result);
    } catch (e) {
      toast({
        title: "Something went wrong",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className={`p-3 border-primary/30 bg-primary/5 ${compact ? "" : "p-4"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold truncate">
              {action.preview_title ?? action.tool_name}
            </p>
            <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
              Needs approval
            </Badge>
          </div>
          {action.preview_body && (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {action.preview_body}
            </p>
          )}
          <div className="flex gap-2 mt-2.5">
            <Button
              size="sm"
              className="h-8"
              onClick={() => handle("approved")}
              disabled={busy !== null}
            >
              {busy === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => handle("rejected")}
              disabled={busy !== null}
            >
              {busy === "reject" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
