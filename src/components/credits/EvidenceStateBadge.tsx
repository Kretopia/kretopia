import { BadgeCheck, Link2, Search, ShieldCheck, UserCheck, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVIDENCE_STATE_LABEL, type EvidenceState } from "@/lib/creditEvidence";

const ICON: Record<EvidenceState, LucideIcon> = {
  claimed: UserCheck,
  publicly_sourced: Search,
  evidence_backed: Link2,
  co_signed: BadgeCheck,
  organization_confirmed: ShieldCheck,
  pending_review: Clock,
};

/** Restrained, accent-gated by tier — only "organization_confirmed" gets the full #FF2DA1 fill. */
const TONE: Record<EvidenceState, string> = {
  claimed: "text-white/55 bg-white/[0.06] border-white/15",
  publicly_sourced: "text-white/65 bg-white/[0.06] border-white/15",
  evidence_backed: "text-white/80 bg-[#FF2DA1]/10 border-[#FF2DA1]/25",
  co_signed: "text-white bg-[#FF2DA1]/15 border-[#FF2DA1]/35",
  organization_confirmed: "text-white bg-[#FF2DA1] border-[#FF2DA1]",
  pending_review: "text-white/50 bg-white/[0.04] border-white/10 border-dashed",
};

interface EvidenceStateBadgeProps {
  state: EvidenceState;
  size?: "sm" | "md";
  className?: string;
}

export function EvidenceStateBadge({ state, size = "sm", className }: EvidenceStateBadgeProps) {
  const Icon = ICON[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        TONE[state],
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
      {EVIDENCE_STATE_LABEL[state]}
    </span>
  );
}

export default EvidenceStateBadge;
