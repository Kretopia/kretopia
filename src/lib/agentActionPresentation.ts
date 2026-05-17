import type { AgentResultCardData } from "@/components/agent/AgentResultCard";
import type { OrchAction } from "@/lib/agentOrchestrator";

export const resultCardForAction = (action: OrchAction): AgentResultCardData | null => {
  if (action.status !== "auto_executed" && action.status !== "executed") return null;

  const result = (action.result ?? {}) as any;
  const payload = (result.result ?? result) as any;

  if (action.tool_name === "find_sponsors") {
    const count = Array.isArray(payload.leads) ? payload.leads.length : payload.count;
    const href = payload.project_id ? `/desk/${payload.project_id}?section=sponsors` : "/intel?tab=sponsors";
    return {
      id: action.id,
      icon: "sponsor",
      title: count ? `${count} sponsor leads found` : "Sponsor leads ready",
      subtitle: payload.project_title
        ? `Review names, contacts, and match reasons inside ${payload.project_title}.`
        : "Review names, contacts, sources, and match reasons in Intel.",
      href,
      cta: payload.project_id ? "Open Sponsors" : "Open Intel",
    };
  }

  if (action.tool_name === "weekly_money_summary") {
    return {
      id: action.id,
      icon: "money",
      title: "Money summary ready",
      subtitle: "Review invoices and payment next steps.",
      href: "/thrivepay",
      cta: "Open Pay",
    };
  }

  if (action.tool_name === "draft_outreach_email") {
    return {
      id: action.id,
      icon: "outreach",
      title: "Sponsor outreach draft ready",
      subtitle: "Review before sending.",
      href: "/inbox",
    };
  }

  return null;
};