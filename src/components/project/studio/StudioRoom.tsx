import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { VibeHeader } from "./VibeHeader";
import { StudioPulseFeed } from "./StudioPulseFeed";
import { NextStepCard } from "./NextStepCard";
import { ProactiveCards } from "./ProactiveCards";
import { BriefSection } from "./BriefSection";
import { WorkSection } from "./WorkSection";
import { MoneySection } from "./MoneySection";
import { PeopleSection } from "./PeopleSection";
import { AddCreditSection } from "./AddCreditSection";
import { WrapProjectCard } from "./WrapProjectCard";
import { CallHistorySection } from "./CallHistorySection";
import { PadPreviewSection } from "./PadPreviewSection";
import { DeliverablesSection } from "./DeliverablesSection";
import { ProductionPrepSection } from "./ProductionPrepSection";
import { PodcastStudioSection } from "./PodcastStudioSection";
import { EventStudioSection } from "./EventStudioSection";
import { EventHeroCard } from "./EventHeroCard";
import { EventCrmSection } from "./EventCrmSection";
import { EventSponsorsKanban } from "./EventSponsorsKanban";
import { EventRsvpQuestionsBuilder } from "./EventRsvpQuestionsBuilder";
import { EventGuestMatchesSection } from "./EventGuestMatchesSection";
import { EventSeatingPlanner } from "./EventSeatingPlanner";
import { EventOutreachSegmentBuilder } from "./EventOutreachSegmentBuilder";
import { RequestPaymentCard } from "./RequestPaymentCard";
import { SortableSection } from "./SortableSection";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStudioPresence } from "@/hooks/useStudioPresence";
import { useProjectMoneySignal } from "@/hooks/useProjectMoneySignal";
import { useStudioRole } from "@/hooks/useStudioRole";
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
  const moneySignal = useProjectMoneySignal(project);

  const isOwner = project?.created_by === currentUserId;

  // Normalize collaborator shape (id is profile id; full_name from join in useProjectData)
  const people = collaborators.map((c: any) => ({
    id: c.id,
    full_name: c.full_name || c.profiles?.full_name || "Member",
    avatar_url: c.avatar_url ?? c.profiles?.avatar_url ?? null,
    role: c.role ?? null,
  }));

  // Role-based permissions
  const perms = useStudioRole(project, currentUserId, people);
  const isClient = perms.role === "client";
  const isCollaborator = perms.role === "collaborator" || perms.role === "creative";
  // Owner sees money normally; client sees a read-only "amount due / pay" view; collaborators don't see money.
  const showMoney = (perms.canSeeMoney && moneySignal.visible) || isClient;
  const showAITools = perms.canUseAI;
  const showPrep = perms.isOwner; // Run-of-show / call sheets stay internal until shared

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
      const msg = String(err?.message || "");
      const isQuota = /quota exceeded/i.test(msg) || /storage.*full/i.test(msg);
      toast({
        title: isQuota ? "Storage full" : "Couldn't add reference",
        description: isQuota
          ? "Free up space in your Vault or upgrade your plan to add more references."
          : msg,
        variant: "destructive",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ===== Reusable section blocks (mobile keeps original order) =====
  const RoomChatButton = (
    <button
      type="button"
      onClick={() => onNavigateToTab("messages")}
      className="mx-4 mb-3 mt-1 flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors p-3 text-left lg:mx-0 lg:w-full"
    >
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span aria-hidden className="text-base">💬</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Room chat</p>
        <p className="text-[11px] text-muted-foreground leading-tight">
          Talk to everyone here · @mentions, files & voice
        </p>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Open</span>
    </button>
  );

  const mobileWorkColumn = (
    <div className="divide-y divide-border/60">
      <BriefSection project={project} files={files} isOwner={isOwner} onUpdated={onUpdated} onAddReference={handleAddReference} currentUserId={currentUserId} />
      <StudioPulseFeed projectId={project.id} currentUserId={currentUserId} collaborators={people} />
      <DeliverablesSection projectId={project.id} currentUserId={currentUserId} isOwner={isOwner} />
      <PadPreviewSection projectId={project.id} onOpen={() => onNavigateToTab("notes")} />
      {showPrep && (
        <ProductionPrepSection project={project} tasks={tasks} currentUserId={currentUserId} onOpenTool={(tab) => onNavigateToTab(tab)} onUpdated={onUpdated} />
      )}
      <WorkSection tasks={tasks} projectId={project.id} currentUserId={currentUserId} collaborators={people} onUpdated={onUpdated} />
    </div>
  );

  const mobileSideColumn = (
    <div className="divide-y divide-border/60">
      {showMoney && (
        <MoneySection project={project} isOwner={isOwner} clientView={isClient} onOpenInvoice={() => onNavigateToTab("finance", "create-invoice")} />
      )}
      {isCollaborator && (
        <RequestPaymentCard project={project} currentUserId={currentUserId} />
      )}
      <PeopleSection collaborators={people} ownerUserId={project.created_by} currentUserId={currentUserId} isOwner={isOwner} projectId={project.id} onUpdated={onUpdated} onlineUserIds={onlineUserIds} onKnock={knock} />
      <WrapProjectCard project={project} tasks={tasks} collaborators={people} currentUserId={currentUserId} isOwner={isOwner} onUpdated={onUpdated} />
      <AddCreditSection project={project} collaborators={people} />
      <CallHistorySection projectId={project.id} />
    </div>
  );

  // ===== Desktop draggable widgets =====
  type WidgetId =
    | "brief" | "pulse" | "deliverables" | "pad" | "prep" | "work"
    | "money" | "request_pay" | "people" | "wrap" | "credit" | "calls";

  const renderWidget = (id: WidgetId): React.ReactNode => {
    const wrap = (node: React.ReactNode) => (
      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">{node}</div>
    );
    switch (id) {
      case "brief": return wrap(<BriefSection project={project} files={files} isOwner={isOwner} onUpdated={onUpdated} onAddReference={handleAddReference} currentUserId={currentUserId} />);
      case "pulse": return wrap(<StudioPulseFeed projectId={project.id} currentUserId={currentUserId} collaborators={people} />);
      case "deliverables": return wrap(<DeliverablesSection projectId={project.id} currentUserId={currentUserId} isOwner={isOwner} />);
      case "pad": return wrap(<PadPreviewSection projectId={project.id} onOpen={() => onNavigateToTab("notes")} />);
      case "prep": return showPrep ? wrap(<ProductionPrepSection project={project} tasks={tasks} currentUserId={currentUserId} onOpenTool={(tab) => onNavigateToTab(tab)} onUpdated={onUpdated} />) : null;
      case "work": return wrap(<WorkSection tasks={tasks} projectId={project.id} currentUserId={currentUserId} collaborators={people} onUpdated={onUpdated} />);
      case "money": return showMoney ? wrap(<MoneySection project={project} isOwner={isOwner} clientView={isClient} onOpenInvoice={() => onNavigateToTab("finance", "create-invoice")} />) : null;
      case "request_pay": return isCollaborator ? wrap(<RequestPaymentCard project={project} currentUserId={currentUserId} />) : null;
      case "people": return wrap(<PeopleSection collaborators={people} ownerUserId={project.created_by} currentUserId={currentUserId} isOwner={isOwner} projectId={project.id} onUpdated={onUpdated} onlineUserIds={onlineUserIds} onKnock={knock} />);
      case "wrap": return wrap(<WrapProjectCard project={project} tasks={tasks} collaborators={people} currentUserId={currentUserId} isOwner={isOwner} onUpdated={onUpdated} />);
      case "credit": return wrap(<AddCreditSection project={project} collaborators={people} />);
      case "calls": return wrap(<CallHistorySection projectId={project.id} />);
    }
  };

  const DEFAULT_LEFT: WidgetId[] = ["brief", "pulse", "deliverables", "pad", "prep", "work"];
  const DEFAULT_RIGHT: WidgetId[] = ["money", "request_pay", "people", "wrap", "credit", "calls"];
  const STORAGE_KEY = `thrivedesk:widgets:${project.id}`;

  const [leftOrder, setLeftOrder] = useState<WidgetId[]>(DEFAULT_LEFT);
  const [rightOrder, setRightOrder] = useState<WidgetId[]>(DEFAULT_RIGHT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { left?: WidgetId[]; right?: WidgetId[] };
      const all = [...DEFAULT_LEFT, ...DEFAULT_RIGHT];
      const sanitize = (arr?: WidgetId[]) => (arr ?? []).filter((id) => all.includes(id));
      const merge = (saved: WidgetId[], def: WidgetId[]) => {
        const missing = def.filter((id) => !saved.includes(id) && !sanitize(parsed.left).includes(id) && !sanitize(parsed.right).includes(id));
        return [...saved, ...missing];
      };
      const savedLeft = sanitize(parsed.left);
      const savedRight = sanitize(parsed.right);
      setLeftOrder(merge(savedLeft, DEFAULT_LEFT));
      setRightOrder(merge(savedRight, DEFAULT_RIGHT));
    } catch {/* noop */}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const persist = (left: WidgetId[], right: WidgetId[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right })); } catch {/* noop */}
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (col: "left" | "right") => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const order = col === "left" ? leftOrder : rightOrder;
    const setOrder = col === "left" ? setLeftOrder : setRightOrder;
    const oldIndex = order.indexOf(active.id as WidgetId);
    const newIndex = order.indexOf(over.id as WidgetId);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    persist(col === "left" ? next : leftOrder, col === "right" ? next : rightOrder);
  };

  const resetLayout = () => {
    setLeftOrder(DEFAULT_LEFT);
    setRightOrder(DEFAULT_RIGHT);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    toast({ title: "Studio layout reset" });
  };

  const renderColumn = (ids: WidgetId[], col: "left" | "right") => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(col)}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {ids.map((id) => {
            const node = renderWidget(id);
            if (!node) return null;
            return (
              <SortableSection key={id} id={id}>
                <WidgetErrorBoundary name={id} onReset={resetLayout}>
                  {node}
                </WidgetErrorBoundary>
              </SortableSection>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

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
        collaborators={people}
        onlineUserIds={onlineUserIds}
        currentUserId={currentUserId}
      />

      {/* Proactive nudges — render once, responsive layout below */}
      {showAITools && <ProactiveCards project={project} tasks={tasks} onAction={onNavigateToTab} />}

      {/* Mobile: original single-scroll order */}
      <div className="lg:hidden">
        {RoomChatButton}
        {nextStep && <NextStepCard nextStep={nextStep} onAction={onNavigateToTab} />}
        {project.workspace_type === "podcast" && (
          <PodcastStudioSection project={project} currentUserId={currentUserId} />
        )}
        {["event","event_production"].includes(project.workspace_type) && (
          <>
            <EventHeroCard project={project} />
            <EventStudioSection project={project} currentUserId={currentUserId} />
            <EventCrmSection project={project} currentUserId={currentUserId} kind="supplier" />
            <EventCrmSection project={project} currentUserId={currentUserId} kind="talent" />
            <EventSponsorsKanban project={project} currentUserId={currentUserId} />
            {project.created_by === currentUserId && (
              <>
                <EventRsvpQuestionsBuilder project={project} currentUserId={currentUserId} />
                <EventGuestMatchesSection project={project} currentUserId={currentUserId} />
                <EventSeatingPlanner project={project} currentUserId={currentUserId} />
                <EventOutreachSegmentBuilder project={project} currentUserId={currentUserId} />
              </>
            )}
          </>
        )}
        {mobileWorkColumn}
        {mobileSideColumn}
        <div className="h-12" />
      </div>

      {/* Desktop: 2-column draggable widget board */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-5 lg:px-6 lg:py-5 lg:max-w-[1500px] lg:mx-auto">
        <div className="col-span-12 xl:col-span-8 space-y-4 min-w-0">
          {/* (ProactiveCards lifted above the responsive split — see top of return) */}
          {project.workspace_type === "podcast" && (
            <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
              <PodcastStudioSection project={project} currentUserId={currentUserId} />
            </div>
          )}
          {["event","event_production"].includes(project.workspace_type) && (
            <>
              <EventHeroCard project={project} />
              <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
                <EventStudioSection project={project} currentUserId={currentUserId} />
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
                <EventCrmSection project={project} currentUserId={currentUserId} kind="supplier" />
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
                <EventCrmSection project={project} currentUserId={currentUserId} kind="talent" />
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
                <EventSponsorsKanban project={project} currentUserId={currentUserId} />
              </div>
              {project.created_by === currentUserId && (
                <>
                  <EventRsvpQuestionsBuilder project={project} currentUserId={currentUserId} />
                  <EventGuestMatchesSection project={project} currentUserId={currentUserId} />
                  <EventSeatingPlanner project={project} currentUserId={currentUserId} />
                  <EventOutreachSegmentBuilder project={project} currentUserId={currentUserId} />
                </>
              )}
            </>
          )}
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-muted-foreground/70">
              Tip: hover any section and drag the handle to reorder your studio.
            </p>
            <button
              type="button"
              onClick={resetLayout}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              title="Reset to default layout"
            >
              Reset layout
            </button>
          </div>
          {renderColumn(leftOrder, "left")}
        </div>
        <aside className="col-span-12 xl:col-span-4 space-y-4 min-w-0">
          {RoomChatButton}
          {renderColumn(rightOrder, "right")}
        </aside>
      </div>
    </div>
  );
};
