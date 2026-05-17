import type { AgentResultCardData } from "@/components/agent/AgentResultCard";
import type { OrchAction } from "@/lib/agentOrchestrator";

export const resultCardForAction = (action: OrchAction): AgentResultCardData | null => {
  if (action.status !== "auto_executed" && action.status !== "executed") return null;

  const result = (action.result ?? {}) as any;

  if (action.tool_name === "find_sponsors") {
    const count = Array.isArray(result.leads) ? result.leads.length : result.count;
    return {
      id: action.id,
      icon: "sponsor",
      title: count ? `${count} sponsor leads found` : "Sponsor leads ready",
      subtitle: "Review fit scores and pitch drafts in Intel.",
      href: "/intel",
      cta: "Open Intel",
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