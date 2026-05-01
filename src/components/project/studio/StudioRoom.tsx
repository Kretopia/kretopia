import { useMemo, useRef } from "react";
import { VibeHeader } from "./VibeHeader";
import { NextStepCard } from "./NextStepCard";
import { ProactiveCards } from "./ProactiveCards";
import { BriefSection } from "./BriefSection";
import { WorkSection } from "./WorkSection";
import { MoneySection } from "./MoneySection";
import { PeopleSection } from "./PeopleSection";
import { AddCreditSection } from "./AddCreditSection";
import { CallHistorySection } from "./CallHistorySection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStudioPresence } from "@/hooks/useStudioPresence";
import type { NextStep } from "@/hooks/useProjectFlow";

interface StudioRoomProps {
  project: any;
  tasks: any[];
  files: any[];
  collaborators: Array<{
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role?: string | null;
  }>;
  currentUserId: string;
  onUpdated: () => void;
  onNavigateToTab: (tab: string, intent?: string) => void;
  nextStep?: NextStep;
}

/**
 * Studio Room — single scrolling, warm view of a project. Mobile-first.
 * Composes: VibeHeader → BriefSection → WorkSection → MoneySection →
 * PeopleSection → AddCreditSection.
 */
export const StudioRoom = ({
  project,
  tasks,
  files,
  collaborators,
  currentUserId,
  onUpdated,
  onNavigateToTab,
  nextStep,
}: StudioRoomProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isOwner = project?.created_by === currentUserId;

  // Normalize collaborator shape (id is profile id; full_name from join in useProjectData)
  const people = collaborators.map((c: any) => ({
    id: c.id,
    full_name: c.full_name || c.profiles?.full_name || "Member",
    avatar_url: c.avatar_url ?? c.profiles?.avatar_url ?? null,
    role: c.role ?? null,
  }));

  // Identify current user from the people list for presence metadata
  const me = useMemo(
    () => people.find((p) => p.id === currentUserId) ?? null,
    [people, currentUserId],
  );
  const { onlineUserIds, knock } = useStudioPresence(
    project?.id,
    me ? { id: me.id, full_name: me.full_name, avatar_url: me.avatar_url } : null,
  );

  const handleAddReference = () => {
    if (!isOwner) {
      toast({ title: "Only the owner can add references" });
      return;
    }
    fileRef.current?.click();
  };

  const handleReferencePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    try {
      for (const file of picked) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${project.id}/moodboard-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("project-files")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        await supabase.from("project_files").insert({
          project_id: project.id,
          user_id: currentUserId,
          file_name: file.name,
          file_url: path, // store relative path; render via signed URL
          file_type: file.type,
          file_size: file.size,
        });
      }
      toast({ title: picked.length > 1 ? "References added" : "Reference added" });
      onUpdated();
    } catch (err: any) {
      toast({
        title: "Couldn't add reference",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleReferencePick}
      />

      <VibeHeader
        project={project}
        clientDisplayName={project.client_name}
        isOwner={isOwner}
        onUpdated={onUpdated}
      />

      {nextStep && (
        <NextStepCard nextStep={nextStep} onAction={onNavigateToTab} />
      )}

      <div className="divide-y divide-border/60">
        <BriefSection
          project={project}
          files={files}
          isOwner={isOwner}
          onUpdated={onUpdated}
          onAddReference={handleAddReference}
        />

        <WorkSection
          tasks={tasks}
          projectId={project.id}
          currentUserId={currentUserId}
          onUpdated={onUpdated}
        />

        <MoneySection
          project={project}
          isOwner={isOwner}
          onOpenInvoice={() => onNavigateToTab("finance", "create_invoice")}
        />

        <PeopleSection
          collaborators={people}
          ownerUserId={project.created_by}
          currentUserId={currentUserId}
          isOwner={isOwner}
          projectId={project.id}
          onUpdated={onUpdated}
          onlineUserIds={onlineUserIds}
          onKnock={knock}
        />

        <AddCreditSection project={project} collaborators={people} />

        <CallHistorySection projectId={project.id} />
      </div>

      {/* Bottom breathing room above mobile nav */}
      <div className="h-12" />
    </div>
  );
};
