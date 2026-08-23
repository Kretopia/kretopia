import { useNavigate } from "react-router-dom";
import { ShieldCheck, Clock3, FileWarning, Link2, Plus, Handshake } from "lucide-react";
import type { MyCredit } from "@/hooks/useMyCredits";
import { DashboardPanel, CreditsEmptyState, CreditsPanelSkeleton } from "./CreditsPrimitives";
import { resolveCreditThumbnail } from "@/lib/thumbnailExtractor";
import { cn } from "@/lib/utils";

interface Props {
  credits: MyCredit[];
  loading?: boolean;
  query: string;
  index?: number;
}

function statusChip(c: MyCredit) {
  if (c.verification_status === "verified") {
    return { icon: ShieldCheck, label: "Verified", cls: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10" };
  }
  if (!c.url && !c.primary_media_url) {
    return { icon: FileWarning, label: "Needs evidence", cls: "text-amber-300 border-amber-400/25 bg-amber-400/10" };
  }
  return { icon: Clock3, label: "Pending co-sign", cls: "text-white/60 border-white/12 bg-white/[0.03]" };
}

/**
 * CreditsStampsPanel — the person's own stamps, rendered inline in Credits.
 * No "My Stamps" label, no category counters: the list itself is the record.
 */
export function CreditsStampsPanel({ credits, loading, query, index }: Props) {
  const navigate = useNavigate();

  return (
    <DashboardPanel
      id="stamps"
      eyebrow="02"
      title="Stamps"
      index={index}
      action={
        <button
          type="button"
          onClick={() => navigate("/profile?add=credit")}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add credit
        </button>
      }
    >
      {loading ? (
        <CreditsPanelSkeleton rows={4} />
      ) : credits.length === 0 ? (
        query ? (
          <CreditsEmptyState
            title={`Nothing of yours matches "${query.slice(0, 40)}"`}
            body="This search only looks inside your own record. Try a different project, role or year."
          />
        ) : (
          <CreditsEmptyState
            title="No credits on your record yet"
            body="Add the work you've done. Attach a link or a file as evidence, then ask the people who were there to co-sign it."
            icon={<ShieldCheck className="h-7 w-7" />}
          />
        )
      ) : (
        <ul className="space-y-2">
          {credits.map((c) => {
            const chip = statusChip(c);
            const img = resolveCreditThumbnail(c.thumbnail_url, c.primary_media_url, c.url);
            return (
              <li key={c.id}>
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 transition-colors hover:border-white/18">
                  {img ? (
                    <img src={img} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-semibold text-white/40">
                      {(c.project_name || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">{c.project_name}</h3>
                    <p className="truncate text-xs text-white/50">
                      {[c.role, c.client_brand, c.year].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {c.endorsement_count > 0 && (
                      <span className="hidden items-center gap-1 rounded-full border border-white/12 px-2 py-1 text-[10px] font-medium text-white/55 sm:inline-flex">
                        <Handshake className="h-3 w-3" aria-hidden />
                        {c.endorsement_count}
                      </span>
                    )}
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open evidence for ${c.project_name}`}
                        className="rounded-full border border-white/12 p-1.5 text-white/55 transition-colors hover:text-white"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold", chip.cls)}>
                      <chip.icon className="h-3 w-3" aria-hidden />
                      <span className="hidden sm:inline">{chip.label}</span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
