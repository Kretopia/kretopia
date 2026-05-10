import { useRef, useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/extractBriefDocument";
import { StudioComingAliveLoader } from "@/components/onboarding/claim-flow/StudioComingAliveLoader";

interface BriefDropZoneProps {
  projectId: string;
  projectTitle: string;
  isOwner: boolean;
  onIngested: () => void;
}

interface IngestSummary {
  fileName: string;
  brief?: string;
  tasks: number;
  deliverables: number;
  runOfShow: number;
  suppliers: number;
  talent: number;
}

const offsetToISODate = (offset: number | null | undefined): string | null => {
  if (offset == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

/**
 * Top-of-studio drop target. Drop any plan/PDF/text doc — we extract, elevate
 * via `elevate-brief`, and spread the output across:
 *   • projects.description (the brief)
 *   • project_tasks
 *   • project_deliverables
 *   • project_run_of_show / event_suppliers / event_talent (event studios)
 *   • project_notes (full elevated brief preserved)
 */
export const BriefDropZone = ({
  projectId,
  projectTitle,
  isOwner,
  onIngested,
}: BriefDropZoneProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<IngestSummary | null>(null);

  if (!isOwner) return null;

  const ingest = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setSummary(null);
    setBusy(true);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("File too large (max 25 MB)");

      // 1. Extract text client-side
      const extracted = await extractTextFromFile(file);
      if (!extracted.text.trim()) {
        throw new Error("No readable text found. If it's a scanned PDF, paste the text instead.");
      }

      // 2. Elevate via edge function
      const { data, error: elevateErr } = await supabase.functions.invoke("elevate-brief", {
        body: {
          source: "text",
          text: `[Uploaded plan — ${file.name}]\n\n${extracted.text}`,
          project_title: projectTitle,
        },
      });
      if (elevateErr) throw elevateErr;
      if (!data?.elevated_brief) throw new Error("Couldn't read this plan — try a different file");

      const brief = data.elevated_brief as {
        title: string;
        summary: string;
        objectives: string[];
        audience: string;
        tone: string;
        success_criteria: string[];
        research_notes: string[];
      };
      const deliverables: any[] = data.deliverables ?? [];
      const tasks: any[] = data.tasks ?? [];
      const runOfShow: any[] = Array.isArray(data.run_of_show) ? data.run_of_show : [];
      const suppliers: any[] = Array.isArray(data.suppliers) ? data.suppliers : [];
      const talent: any[] = Array.isArray(data.talent) ? data.talent : [];

      const { data: userRes } = await supabase.auth.getUser();
      const me = userRes?.user?.id;
      if (!me) throw new Error("Not signed in");

      // 3. Set the project description (the brief itself)
      const briefText = [brief.summary, "", `Audience: ${brief.audience}`, `Tone: ${brief.tone}`]
        .filter(Boolean)
        .join("\n");
      await supabase
        .from("projects")
        .update({ description: briefText.slice(0, 4000) })
        .eq("id", projectId);

      // 4. Tasks
      if (tasks.length) {
        const rows = tasks
          .filter((t) => t.title?.trim())
          .map((t) => ({
            project_id: projectId,
            title: t.title.trim().slice(0, 200),
            description: t.description ?? null,
            status: "todo",
            priority: t.priority ?? "normal",
            assigned_to: t.suggested_assignee_id || null,
            created_by: me,
            due_date: offsetToISODate(t.due_offset_days)
              ? new Date(offsetToISODate(t.due_offset_days)!).toISOString()
              : null,
            labels: ["smart-brief"],
          }));
        if (rows.length) {
          await supabase.from("project_tasks").insert(rows as never).then(() => {}, () => {});
        }
      }

      // 5. Deliverables
      if (deliverables.length) {
        const rows = deliverables
          .filter((d) => d.title?.trim())
          .map((d, i) => ({
            project_id: projectId,
            title: d.title.trim().slice(0, 200),
            description: d.description ?? null,
            status: "pending",
            version: 1,
            source: "ai-elevated",
            kind: d.kind ?? "other",
            sort_order: i,
            due_date: offsetToISODate(d.due_offset_days),
            submitted_by: me,
            assignee_id: d.suggested_assignee_id || null,
            moodboard: [] as never,
          }));
        if (rows.length) {
          await supabase.from("project_deliverables").insert(rows as never).then(() => {}, () => {});
        }
      }

      // 6. Run of show
      if (runOfShow.length) {
        const rows = runOfShow
          .filter((r) => r.segment_title?.trim())
          .map((r, i) => ({
            project_id: projectId,
            created_by: me,
            segment_title: r.segment_title.trim().slice(0, 200),
            time_slot: r.time && /^\d{1,2}:\d{2}$/.test(r.time) ? `${r.time}:00` : null,
            duration_min: r.duration_min ?? null,
            notes: r.notes ?? null,
            position: i,
          }));
        if (rows.length) {
          await supabase.from("project_run_of_show").insert(rows as never).then(() => {}, () => {});
        }
      }

      // 7. Suppliers
      if (suppliers.length) {
        const rows = suppliers
          .filter((s) => s.name?.trim())
          .map((s) => ({
            project_id: projectId,
            created_by: me,
            category: s.category || "other",
            name: s.name.trim().slice(0, 200),
            notes: s.notes ?? null,
            status: "lead",
          }));
        if (rows.length) {
          await supabase.from("event_suppliers").insert(rows as never).then(() => {}, () => {});
        }
      }

      // 8. Talent
      if (talent.length) {
        const rows = talent
          .filter((t) => t.name?.trim())
          .map((t) => ({
            project_id: projectId,
            created_by: me,
            role: t.role || "performer",
            name: t.name.trim().slice(0, 200),
            notes: t.notes ?? null,
            status: "invited",
          }));
        if (rows.length) {
          await supabase.from("event_talent").insert(rows as never).then(() => {}, () => {});
        }
      }

      // 9. Save the full elevated brief as a note for reference
      await supabase
        .from("project_notes")
        .insert({
          project_id: projectId,
          created_by: me,
          title: `Brief: ${brief.title}`,
          content: [
            `**Summary**\n${brief.summary}`,
            `**Audience**\n${brief.audience}`,
            `**Tone**\n${brief.tone}`,
            brief.objectives?.length ? `**Objectives**\n${brief.objectives.map((o) => `• ${o}`).join("\n")}` : "",
            brief.success_criteria?.length ? `**Success criteria**\n${brief.success_criteria.map((s) => `• ${s}`).join("\n")}` : "",
            brief.research_notes?.length ? `**Research notes**\n${brief.research_notes.map((r) => `• ${r}`).join("\n")}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        } as never)
        .then(() => {}, () => {});

      setSummary({
        fileName: file.name,
        brief: brief.title,
        tasks: tasks.length,
        deliverables: deliverables.length,
        runOfShow: runOfShow.length,
        suppliers: suppliers.length,
        talent: talent.length,
      });
      toast({
        title: "Studio populated",
        description: `${tasks.length} tasks · ${deliverables.length} deliverables · ${runOfShow.length} run of show`,
      });
      onIngested();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't process file";
      setError(msg);
      toast({ title: "Drop failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Active processing state — show cinematic loader
  if (busy) {
    return (
      <div className="px-4 pt-5">
        <StudioComingAliveLoader />
        <p className="text-xs text-center text-muted-foreground mt-2">
          Reading your plan and shaping the studio…
        </p>
      </div>
    );
  }

  // Success state — what landed where
  if (summary) {
    const rows = [
      { n: summary.tasks, label: "Tasks", where: "Studio feed" },
      { n: summary.deliverables, label: "Deliverables", where: "Vault" },
      { n: summary.runOfShow, label: "Run of show", where: "Event" },
      { n: summary.suppliers, label: "Suppliers", where: "Event" },
      { n: summary.talent, label: "Talent", where: "Event" },
    ].filter((r) => r.n > 0);

    return (
      <div className="px-4 pt-5">
        <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-5 animate-fade-in">
          <button
            type="button"
            onClick={() => setSummary(null)}
            className="absolute top-2 right-2 h-7 w-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Here's what landed in your studio</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3 truncate">
            From <span className="font-medium text-foreground">{summary.fileName}</span>
            {summary.brief ? <> · {summary.brief}</> : null}
          </p>
          {rows.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {rows.map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="rounded-full font-bold tabular-nums min-w-[28px] justify-center">
                    {r.n}
                  </Badge>
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted-foreground">→ {r.where}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Brief saved — no extras detected.</p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8 text-xs gap-1.5 rounded-full"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3 w-3" /> Drop another
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,.csv,application/pdf,text/plain,text/markdown,text/csv"
            className="hidden"
            onChange={(e) => ingest(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.csv,application/pdf,text/plain,text/markdown,text/csv"
        className="hidden"
        onChange={(e) => ingest(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          ingest(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "group relative overflow-hidden rounded-2xl cursor-pointer transition-all",
          "border-2 border-dashed",
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-primary/30 bg-gradient-to-br from-primary/5 via-[hsl(var(--energy)/0.04)] to-transparent hover:border-primary/60 hover:from-primary/10",
          "p-4 sm:p-5",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[var(--shadow-glow)] group-hover:scale-105 transition-transform">
            <Upload className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold leading-tight">Drop a plan to start the studio</p>
              <Badge
                variant="secondary"
                className="rounded-full text-[10px] font-bold uppercase tracking-wider bg-[hsl(var(--energy)/0.15)] text-[hsl(var(--energy))] border border-[hsl(var(--energy)/0.3)]"
              >
                Auto-spreads
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              PDF, doc, or notes from any AI — we'll fill the brief, tasks, deliverables, run of show,
              suppliers & talent in one shot.
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>PDF · .txt · .md · .csv · max 25 MB</span>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2.5 flex items-start gap-2">
          <Loader2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
