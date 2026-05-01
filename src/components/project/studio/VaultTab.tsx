import { useEffect, useState } from "react";
import { FolderLock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FileBrowser } from "@/components/project/files/FileBrowser";
import { WorkflowShell } from "@/components/project/studio/WorkflowShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STANDARD_FOLDERS = [
  "Brief & References",
  "Work-in-Progress",
  "Final Deliverables",
  "Client-Shared",
];

interface VaultTabProps {
  projectId: string;
  files: any[];
  currentUserId: string;
  onFileUploaded: () => void;
  onJumpToBrief?: () => void;
}

/**
 * The Vault — Studio-styled wrapper around FileBrowser.
 * - Auto-bootstraps the four standard folders on first open.
 * - Surfaces a quick stat strip (total files, pending approvals).
 * - Inline-Drop approvals still live on each Drop card in the Studio feed.
 */
export function VaultTab({
  projectId,
  files,
  currentUserId,
  onFileUploaded,
  onJumpToBrief,
}: VaultTabProps) {
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Bootstrap standard folders once
  useEffect(() => {
    let cancelled = false;
    const ensureFolders = async () => {
      const { data: existing } = await supabase
        .from("project_file_folders")
        .select("name")
        .eq("project_id", projectId)
        .is("parent_id", null);

      if (cancelled) return;
      const have = new Set((existing || []).map((f: any) => f.name));
      const missing = STANDARD_FOLDERS.filter((n) => !have.has(n));
      if (missing.length === 0) return;

      await supabase.from("project_file_folders").insert(
        missing.map((name) => ({
          project_id: projectId,
          name,
          parent_id: null,
          created_by: currentUserId,
        })),
      );
    };
    ensureFolders().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId, currentUserId]);

  // Pending approval count (deliverables awaiting review)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("deliverables")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "submitted");
      if (!cancelled) setPendingApprovals(count ?? 0);
    };
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId, files.length]);

  return (
    <WorkflowShell
      eyebrow="The Vault"
      title="Files & Approvals"
      subtitle="Brief refs, works-in-progress, final deliverables — all in one place."
      icon={FolderLock}
    >
      {/* Quick stat strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full font-semibold">
          {files.length} file{files.length === 1 ? "" : "s"}
        </Badge>
        {pendingApprovals > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-full gap-1.5 border-[hsl(var(--energy)/0.4)] text-[hsl(var(--energy))] hover:bg-[hsl(var(--energy)/0.1)]"
            onClick={onJumpToBrief}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {pendingApprovals} awaiting your review
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">
          Approvals live on each Drop in the Studio feed.
        </span>
      </div>

      <FileBrowser
        projectId={projectId}
        files={files}
        onFileUploaded={onFileUploaded}
      />
    </WorkflowShell>
  );
}
