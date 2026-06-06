import { useRef, useState } from "react";
import { Upload, Loader2, X, Link2, Sparkles, AlertCircle, ImagePlus, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  facts: number;
  entities: number;
}

const offsetToISODate = (offset: number | null | undefined): string | null => {
  if (offset == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const TEXT_EXTS = /\.(pdf|txt|md|markdown|csv)$/i;

/**
 * Studio drop zone — the unified entry point. Drop anything (plan, contract,
 * budget, sponsor deck, voice note, photos, paste a link) and we route it
 * through `studio-ingest` so it lands in the Studio Brain as reusable facts
 * and entities. Text-shaped documents (PDF/MD/CSV/TXT) are also elevated
 * via `elevate-brief` to populate tasks, deliverables, run-of-show etc.
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
  const [linkValue, setLinkValue] = useState("");
  const [showLink, setShowLink] = useState(false);

  if (!isOwner) return null;

  const sourceKindFor = (file: File): string => {
    const n = file.name.toLowerCase();
    const t = file.type.toLowerCase();
    if (t.startsWith("image/")) return "image";
    if (t.startsWith("audio/") || /\.(m4a|mp3|wav|webm|ogg)$/.test(n)) return "voice";
    if (n.endsWith(".pdf") || t === "application/pdf") return "pdf";
    if (n.endsWith(".eml") || n.endsWith(".msg")) return "email";
    if (/budget|invoice|quote/.test(n)) return "budget";
    if (/contract|agreement|nda|sow/.test(n)) return "contract";
    if (/deck|pitch|sponsor|proposal/.test(n)) return "deck";
    return "brief";
  };

  const callIngest = async (payload: Record<string, unknown>) => {
    const { data, error: invErr } = await supabase.functions.invoke("studio-ingest", {
      body: { project_id: projectId, project_title: projectTitle, ...payload },
    });
    if (invErr) throw invErr;
    if (data?.error) throw new Error(String(data.error));
    return data ?? { facts: 0, entities: 0 };
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const result = String(r.result || "");
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      r.onerror = () => reject(r.error || new Error("read failed"));
      r.readAsDataURL(file);
    });

  // Compress an image to <= ~1280px on the longest side, JPEG, to keep payload small.
  const compressImage = async (file: File): Promise<{ base64: string; mime: string }> => {
    if (file.size <= 900 * 1024 && file.type === "image/jpeg") {
      return { base64: await fileToBase64(file), mime: "image/jpeg" };
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      return { base64: dataUrl.split(",")[1] ?? "", mime: "image/jpeg" };
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const ingestFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setSummary(null);
    setBusy(true);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("File too large (max 25 MB)");

      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/") || /\.(m4a|mp3|wav|webm|ogg)$/i.test(file.name);
      const isTextDoc = TEXT_EXTS.test(file.name) || file.type === "application/pdf" || file.type.startsWith("text/");
      const source_kind = sourceKindFor(file);

      let elevated: any = null;
      let extractedText = "";
      let visionPayload: { image_base64?: string; image_mime?: string } = {};
      let audioPayload: { audio_base64?: string; audio_mime?: string } = {};

      if (isImage) {
        // Phase D — route images through vision extraction
        const { base64, mime } = await compressImage(file);
        visionPayload = { image_base64: base64, image_mime: mime };
        extractedText = "";
      } else if (isAudio) {
        // Phase D+ — voice notes go straight to Gemini audio
        if (file.size > 15 * 1024 * 1024) throw new Error("Audio too large (max 15 MB)");
        const base64 = await fileToBase64(file);
        audioPayload = { audio_base64: base64, audio_mime: file.type || "audio/webm" };
        extractedText = "";
      } else if (isTextDoc) {
        try {
          const extracted = await extractTextFromFile(file);
          extractedText = extracted.text.trim();
        } catch {
          extractedText = "";
        }

        // Scanned PDF fallback — render first page as image and route through
        // vision so a scanned deck never hard-fails.
        if (!extractedText && file.type === "application/pdf") {
          try {
            const { renderPdfFirstPageToImage } = await import("@/lib/extractBriefDocument");
            const img = await renderPdfFirstPageToImage(file);
            visionPayload = { image_base64: img.base64, image_mime: img.mime };
          } catch {
            throw new Error("Couldn't read this PDF. Try a screenshot or a text-based export.");
          }
        } else if (!extractedText) {
          throw new Error("No readable text found.");
        }

        // Brief-elevation path for plan-like documents only
        if (extractedText && (source_kind === "brief" || source_kind === "pdf")) {
          const { data, error: elevateErr } = await supabase.functions.invoke("elevate-brief", {
            body: {
              source: "text",
              text: `[Uploaded — ${file.name}]\n\n${extractedText}`,
              project_title: projectTitle,
            },
          });
          if (!elevateErr && data?.elevated_brief) elevated = data;
        }
      } else if (file.type.startsWith("text/") || /\.(csv|tsv|md|txt|json|yml|yaml)$/i.test(file.name)) {
        // Plain text-ish files not caught by TEXT_EXTS — read as text.
        try {
          extractedText = (await file.text()).slice(0, 200_000);
        } catch {
          extractedText = `[${source_kind} drop — ${file.name}]`;
        }
      } else {
        // other — let downstream classify; pass a hint string
        extractedText = `[${source_kind} drop — ${file.name}]`;
      }


      // 1. Brief elevation side-effects (tasks / deliverables / run-of-show)
      let elevatedCounts = { tasks: 0, deliverables: 0, runOfShow: 0, suppliers: 0, talent: 0, brief: "" as string | undefined };
      if (elevated?.elevated_brief) {
        const brief = elevated.elevated_brief;
        const deliverables: any[] = elevated.deliverables ?? [];
        const tasks: any[] = elevated.tasks ?? [];
        const runOfShow: any[] = Array.isArray(elevated.run_of_show) ? elevated.run_of_show : [];
        const suppliers: any[] = Array.isArray(elevated.suppliers) ? elevated.suppliers : [];
        const talent: any[] = Array.isArray(elevated.talent) ? elevated.talent : [];
        const { data: userRes } = await supabase.auth.getUser();
        const me = userRes?.user?.id;
        if (me) {
          const briefText = [brief.summary, "", `Audience: ${brief.audience}`, `Tone: ${brief.tone}`].filter(Boolean).join("\n");
          await supabase.from("projects").update({ description: briefText.slice(0, 4000) }).eq("id", projectId);

          if (tasks.length) {
            const rows = tasks.filter((t) => t.title?.trim()).map((t) => ({
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
            if (rows.length) await supabase.from("project_tasks").insert(rows as never).then(() => {}, () => {});
          }
          if (deliverables.length) {
            const rows = deliverables.filter((d) => d.title?.trim()).map((d, i) => ({
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
            if (rows.length) await supabase.from("project_deliverables").insert(rows as never).then(() => {}, () => {});
          }
          if (runOfShow.length) {
            const rows = runOfShow.filter((r) => r.segment_title?.trim()).map((r, i) => ({
              project_id: projectId,
              created_by: me,
              segment_title: r.segment_title.trim().slice(0, 200),
              time_slot: r.time && /^\d{1,2}:\d{2}$/.test(r.time) ? `${r.time}:00` : null,
              duration_min: r.duration_min ?? null,
              notes: r.notes ?? null,
              position: i,
            }));
            if (rows.length) await supabase.from("project_run_of_show").insert(rows as never).then(() => {}, () => {});
          }
          if (suppliers.length) {
            const rows = suppliers.filter((s) => s.name?.trim()).map((s) => ({
              project_id: projectId,
              created_by: me,
              category: s.category || "other",
              name: s.name.trim().slice(0, 200),
              notes: s.notes ?? null,
              status: "lead",
            }));
            if (rows.length) await supabase.from("event_suppliers").insert(rows as never).then(() => {}, () => {});
          }
          if (talent.length) {
            const rows = talent.filter((t) => t.name?.trim()).map((t) => ({
              project_id: projectId,
              created_by: me,
              role: t.role || "performer",
              name: t.name.trim().slice(0, 200),
              notes: t.notes ?? null,
              status: "invited",
            }));
            if (rows.length) await supabase.from("event_talent").insert(rows as never).then(() => {}, () => {});
          }
          await supabase.from("project_notes").insert({
            project_id: projectId,
            created_by: me,
            title: `Brief: ${brief.title}`,
            content: [
              `**Summary**\n${brief.summary}`,
              `**Audience**\n${brief.audience}`,
              `**Tone**\n${brief.tone}`,
              brief.objectives?.length ? `**Objectives**\n${brief.objectives.map((o: string) => `• ${o}`).join("\n")}` : "",
              brief.success_criteria?.length ? `**Success criteria**\n${brief.success_criteria.map((s: string) => `• ${s}`).join("\n")}` : "",
              brief.research_notes?.length ? `**Research notes**\n${brief.research_notes.map((r: string) => `• ${r}`).join("\n")}` : "",
            ].filter(Boolean).join("\n\n"),
          } as never).then(() => {}, () => {});

          elevatedCounts = {
            tasks: tasks.length,
            deliverables: deliverables.length,
            runOfShow: runOfShow.length,
            suppliers: suppliers.length,
            talent: talent.length,
            brief: brief.title,
          };
        }
      }

      // 2. Studio Brain — record facts + entities (always)
      let brainErr: string | null = null;
      const brainRes = await callIngest({
        source_kind,
        text: extractedText || undefined,
        file_name: file.name,
        hint: elevated?.elevated_brief?.title,
        ...visionPayload,
        ...audioPayload,
      }).catch((err) => {
        console.error("studio-ingest failed", err);
        brainErr = err?.message || "Brain didn't update";
        return { facts: 0, entities: 0 };
      });

      // Phase F — also file the drop into the right Studio section:
      // images → Moodboard (project_files), so they're not lost to the Brain alone.
      if (isImage) {
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const me = userRes?.user?.id;
          if (me) {
            const ext = file.name.split(".").pop() || "jpg";
            const path = `${projectId}/drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("project-files")
              .upload(path, file, { cacheControl: "3600", upsert: false });
            if (!upErr) {
              const { data: pub } = supabase.storage.from("project-files").getPublicUrl(path);
              await supabase.from("project_files").insert({
                project_id: projectId,
                user_id: me,
                file_name: file.name,
                file_url: pub?.publicUrl ?? path,
                file_type: "image",
              } as never).then(() => {}, () => {});
            }
          }
        } catch (e) {
          console.warn("[dropzone] moodboard upload failed", e);
        }
      }



      setSummary({
        fileName: file.name,
        brief: elevatedCounts.brief,
        tasks: elevatedCounts.tasks,
        deliverables: elevatedCounts.deliverables,
        runOfShow: elevatedCounts.runOfShow,
        suppliers: elevatedCounts.suppliers,
        talent: elevatedCounts.talent,
        facts: brainRes.facts ?? 0,
        entities: brainRes.entities ?? 0,
      });
      if (brainErr) {
        toast({ title: "Brain didn't fully update", description: brainErr, variant: "destructive" });
      } else {
        toast({
          title: "Studio Brain updated",
          description: `${brainRes.facts ?? 0} facts · ${brainRes.entities ?? 0} entities remembered`,
        });
      }
      // Notify any open Brain panels to refresh counts/lists.
      window.dispatchEvent(new CustomEvent("studio-brain:updated", { detail: { projectId } }));
      onIngested();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't process drop";
      setError(msg);
      toast({ title: "Drop failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const ingestLink = async () => {
    const url = linkValue.trim();
    if (!url) return;
    setError(null);
    setSummary(null);
    setBusy(true);
    try {
      const brainRes = await callIngest({
        source_kind: "link",
        url,
        text: `Link dropped into Studio: ${url}`,
        hint: "Extract anything reusable from this URL's title/topic.",
      });
      setSummary({
        fileName: url,
        tasks: 0, deliverables: 0, runOfShow: 0, suppliers: 0, talent: 0,
        facts: brainRes.facts ?? 0,
        entities: brainRes.entities ?? 0,
      });
      setLinkValue("");
      setShowLink(false);
      toast({
        title: "Link remembered",
        description: `${brainRes.facts ?? 0} facts · ${brainRes.entities ?? 0} entities`,
      });
      onIngested();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't ingest link";
      setError(msg);
      toast({ title: "Link failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const ingestThought = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setSummary(null);
    setBusy(true);
    try {
      const brainRes = await callIngest({
        source_kind: "note",
        text: trimmed,
        hint: "User-typed thought dropped into the Studio.",
      });
      // Also drop it into the Pad so it's visible, not just in the Brain.
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const me = userRes?.user?.id;
        if (me) {
          await supabase.from("project_notes").insert({
            project_id: projectId,
            created_by: me,
            title: trimmed.slice(0, 60),
            content: trimmed,
          } as never).then(() => {}, () => {});
        }
      } catch { /* noop */ }
      setSummary({
        fileName: "Thought",
        tasks: 0, deliverables: 0, runOfShow: 0, suppliers: 0, talent: 0,
        facts: brainRes.facts ?? 0,
        entities: brainRes.entities ?? 0,
      });
      toast({
        title: "Got it 🎯",
        description: `Filed to the Pad · Brain +${brainRes.facts ?? 0} facts`,
      });
      onIngested();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't save thought";
      setError(msg);
      toast({ title: "Thought failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

      toast({ title: "Link failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="px-4 pt-5">
        <StudioComingAliveLoader />
        <p className="text-xs text-center text-muted-foreground mt-2">
          Reading and remembering for the Studio Brain…
        </p>
      </div>
    );
  }

  if (summary) {
    const rows = [
      { n: summary.facts, label: "Facts", where: "Studio Brain" },
      { n: summary.entities, label: "Entities", where: "Studio Brain" },
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
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Studio Brain remembered this</h3>
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
            <p className="text-xs text-muted-foreground">Saved — no new facts detected.</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 rounded-full"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3 w-3" /> Drop another
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 rounded-full"
              onClick={() => setShowLink(true)}
            >
              <Link2 className="h-3 w-3" /> Paste link
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,text/*,image/*,audio/*,.csv,.tsv,.md,.json,.yaml,.yml,.docx"
            className="hidden"
            onChange={(e) => ingestFile(e.target.files?.[0] ?? null)}
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
        accept="application/pdf,text/*,image/*,audio/*,.csv,.tsv,.md,.json,.yaml,.yml,.docx"
        className="hidden"
        onChange={(e) => ingestFile(e.target.files?.[0] ?? null)}
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
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          ingestFile(e.dataTransfer.files?.[0] ?? null);
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
              <p className="text-base font-bold leading-tight">Feed the Studio Brain</p>
              <Badge
                variant="secondary"
                className="rounded-full text-[10px] font-bold uppercase tracking-wider bg-[hsl(var(--energy)/0.15)] text-[hsl(var(--energy))] border border-[hsl(var(--energy)/0.3)]"
              >
                Remembers everything
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Drop a sponsor deck, contract, budget, venue PDF, photo, voice
              note, or paste a link. Thrive remembers it so you never re-explain.
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>PDF · doc · image · audio · link · max 25 MB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowLink((v) => !v)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <Link2 className="h-3 w-3" /> {showLink ? "Hide link" : "Paste a link instead"}
        </button>
      </div>
      {showLink && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://… venue page, sponsor site, brief doc"
            className="h-9 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") ingestLink(); }}
          />
          <Button size="sm" onClick={ingestLink} disabled={!linkValue.trim()}>
            Remember
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2.5 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
