import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Calendar, Clock, CheckCircle2, XCircle, Circle, Loader2,
  ArrowRight, Sparkles, Inbox, Upload, ExternalLink, Image as ImageIcon, Plus,
  FolderUp, FileText, Music, Film, FileArchive, File as FileIcon, X,
} from "lucide-react";
import { getProjectFileSignedUrl } from "@/lib/projectFiles";

type Status = "pending" | "in_progress" | "submitted" | "approved" | "rejected";

interface MoodboardItem {
  url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  kind?: "image" | "link" | "video" | null;
}

interface SubmissionFile {
  url: string;
  name: string;
  mime: string;
  size?: number;
  thumbnail_url?: string | null;
  uploaded_by?: string | null;
  uploaded_at?: string | null;
  kind?: "image" | "video" | "audio" | "pdf" | "doc" | "archive" | "file";
}

interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  source: string | null;
  sort_order: number | null;
  created_at: string;
  submitted_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  moodboard: MoodboardItem[] | null;
  kind: string | null;
  submission_files: SubmissionFile[] | null;
}

interface DeliverablesBoardProps {
  projectId: string;
  currentUserId: string;
  onEmpty?: () => void;
}

const COLUMNS: { key: Status; label: string; icon: typeof Circle; tone: string }[] = [
  { key: "pending",     label: "To Do",       icon: Circle,        tone: "bg-muted text-muted-foreground" },
  { key: "in_progress", label: "In Progress", icon: Loader2,       tone: "bg-primary/10 text-primary" },
  { key: "submitted",   label: "Submitted",   icon: Clock,         tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { key: "approved",    label: "Approved",    icon: CheckCircle2,  tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { key: "rejected",    label: "Changes",     icon: XCircle,       tone: "bg-destructive/10 text-destructive" },
];

const NEXT_STATUS: Record<Status, Status | null> = {
  pending: "in_progress",
  in_progress: "submitted",
  submitted: "approved",
  approved: null,
  rejected: "in_progress",
};

const isImageUrl = (u: string) => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(u);

const fileKindFromMime = (mime: string, name: string): SubmissionFile["kind"] => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return "archive";
  if (/\.(docx?|pages|odt|txt|rtf|md)$/i.test(name) || mime.includes("word") || mime.includes("text")) return "doc";
  return "file";
};

const FileKindIcon = ({ kind }: { kind?: SubmissionFile["kind"] }) => {
  switch (kind) {
    case "image": return <ImageIcon className="h-4 w-4" />;
    case "video": return <Film className="h-4 w-4" />;
    case "audio": return <Music className="h-4 w-4" />;
    case "pdf":
    case "doc":   return <FileText className="h-4 w-4" />;
    case "archive": return <FileArchive className="h-4 w-4" />;
    default: return <FileIcon className="h-4 w-4" />;
  }
};

/** Cover preview for a card — first submitted image wins, otherwise first reference image. */
function coverFor(d: Deliverable): { src: string; isWip: boolean } | null {
  const subs = d.submission_files ?? [];
  const firstWipImg = subs.find((s) => s.kind === "image" && (s.thumbnail_url || s.url));
  if (firstWipImg) return { src: (firstWipImg.thumbnail_url || firstWipImg.url)!, isWip: true };
  if (d.thumbnail_url) return { src: d.thumbnail_url, isWip: true };
  if (d.file_url && isImageUrl(d.file_url)) return { src: d.file_url, isWip: true };
  const refs = d.moodboard ?? [];
  const firstImg = refs.find((r) => r.thumbnail_url || (r.url && isImageUrl(r.url)));
  if (firstImg) return { src: (firstImg.thumbnail_url || firstImg.url)!, isWip: false };
  return null;
}

export const DeliverablesBoard = ({ projectId, currentUserId, onEmpty }: DeliverablesBoardProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Deliverable | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newRefUrl, setNewRefUrl] = useState("");
  const wipInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_deliverables")
      .select("id,project_id,title,description,status,due_date,source,sort_order,created_at,submitted_by,reviewed_by,review_note,file_url,thumbnail_url,moodboard")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Couldn't load deliverables", description: error.message, variant: "destructive" });
    } else {
      const rows = (data ?? []).map((r) => ({
        ...r,
        moodboard: Array.isArray(r.moodboard) ? (r.moodboard as unknown as MoodboardItem[]) : [],
      })) as Deliverable[];
      setItems(rows);
      if (!rows.length) onEmpty?.();
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`deliverables-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_deliverables", filter: `project_id=eq.${projectId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Refresh selected card when items reload (so dialog picks up new refs/WIP)
  useEffect(() => {
    if (!selected) return;
    const fresh = items.find((i) => i.id === selected.id);
    if (fresh) setSelected(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const grouped = useMemo(() => {
    const g: Record<Status, Deliverable[]> = {
      pending: [], in_progress: [], submitted: [], approved: [], rejected: [],
    };
    for (const d of items) {
      const s = (COLUMNS.find((c) => c.key === d.status)?.key ?? "pending") as Status;
      g[s].push(d);
    }
    return g;
  }, [items]);

  const advance = async (d: Deliverable, to: Status, note?: string) => {
    setUpdating(true);
    const patch: Record<string, unknown> = { status: to };
    if (to === "approved" || to === "rejected") {
      patch.reviewed_by = currentUserId;
      patch.reviewed_at = new Date().toISOString();
      if (note) patch.review_note = note;
    }
    const { error } = await supabase
      .from("project_deliverables")
      .update(patch)
      .eq("id", d.id);
    setUpdating(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: to === "approved" ? "Approved ✓"
        : to === "rejected" ? "Marked for changes"
        : `Moved to ${COLUMNS.find((c) => c.key === to)?.label}`,
    });
    if (to === "approved") setSelected(null);
    setReviewNote("");
  };

  const uploadWip = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${projectId}/deliverables/${selected.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;

      const signed = await getProjectFileSignedUrl(path, { expiresIn: 60 * 60 * 24 * 7 });
      const isImg = file.type.startsWith("image/");

      const { error: updErr } = await supabase
        .from("project_deliverables")
        .update({
          file_url: signed,
          thumbnail_url: isImg ? signed : null,
          media_type: isImg ? "image" : "file",
          status: "submitted",
          submitted_by: currentUserId,
        })
        .eq("id", selected.id);
      if (updErr) throw updErr;
      toast({ title: "Submitted for review", description: "The client will see your upload on the board." });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (wipInputRef.current) wipInputRef.current.value = "";
    }
  };

  const addReference = async () => {
    if (!selected || !newRefUrl.trim()) return;
    const url = newRefUrl.trim();
    const isImg = isImageUrl(url);
    const next: MoodboardItem[] = [
      ...(selected.moodboard ?? []),
      { url, thumbnail_url: isImg ? url : null, kind: isImg ? "image" : "link", caption: null },
    ];
    const { error } = await supabase
      .from("project_deliverables")
      .update({ moodboard: next as unknown as never })
      .eq("id", selected.id);
    if (error) {
      toast({ title: "Couldn't add reference", description: error.message, variant: "destructive" });
      return;
    }
    setNewRefUrl("");
  };

  const removeReference = async (idx: number) => {
    if (!selected) return;
    const next = (selected.moodboard ?? []).filter((_, i) => i !== idx);
    const { error } = await supabase
      .from("project_deliverables")
      .update({ moodboard: next as unknown as never })
      .eq("id", selected.id);
    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No deliverables yet</p>
            <p className="text-sm text-muted-foreground">
              Use <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Add a Brief</span> above to import them from a doc, sheet, voice memo, or just type them in.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const list = grouped[col.key];
            return (
              <div key={col.key} className="w-72 shrink-0">
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[80px] p-1 rounded-lg bg-muted/30">
                  {list.map((d) => {
                    const cover = coverFor(d);
                    const refCount = d.moodboard?.length ?? 0;
                    return (
                      <button
                        key={d.id}
                        onClick={() => { setSelected(d); setReviewNote(d.review_note ?? ""); }}
                        className="w-full text-left rounded-md border bg-card hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
                      >
                        {cover && (
                          <div className="relative aspect-video bg-muted">
                            <img
                              src={cover.src}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                            {cover.isWip && (
                              <Badge className="absolute top-1.5 left-1.5 text-[9px] py-0 h-4 bg-emerald-600 hover:bg-emerald-600 text-white border-0">
                                WIP
                              </Badge>
                            )}
                            {!cover.isWip && refCount > 1 && (
                              <Badge variant="secondary" className="absolute top-1.5 right-1.5 text-[9px] py-0 h-4 gap-0.5">
                                <ImageIcon className="h-2.5 w-2.5" /> {refCount}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-sm font-medium line-clamp-2">{d.title}</p>
                          {d.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{d.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2 gap-2">
                            {d.due_date ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(d.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            ) : <span />}
                            {!cover && refCount > 0 && (
                              <Badge variant="outline" className="text-[9px] py-0 h-4 gap-0.5">
                                <ImageIcon className="h-2.5 w-2.5" /> {refCount}
                              </Badge>
                            )}
                            {d.source && d.source !== "manual" && (
                              <Badge variant="outline" className="text-[9px] py-0 h-4">{d.source}</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {list.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNewRefUrl(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {selected.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{COLUMNS.find((c) => c.key === selected.status)?.label ?? selected.status}</Badge>
                  {selected.due_date && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(selected.due_date).toLocaleDateString()}
                    </Badge>
                  )}
                  {selected.source && (
                    <Badge variant="outline">via {selected.source}</Badge>
                  )}
                </div>

                {/* Submitted work (WIP) */}
                {(selected.file_url || selected.thumbnail_url) && (
                  <div>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Submitted work
                    </p>
                    {selected.thumbnail_url ? (
                      <a href={selected.file_url ?? selected.thumbnail_url ?? "#"} target="_blank" rel="noreferrer">
                        <img
                          src={selected.thumbnail_url}
                          alt="Submitted work"
                          className="w-full max-h-96 object-contain rounded-lg border bg-muted"
                        />
                      </a>
                    ) : selected.file_url ? (
                      <a
                        href={selected.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" /> Open submitted file
                      </a>
                    ) : null}
                  </div>
                )}

                {/* Moodboard */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Moodboard & references {selected.moodboard?.length ? `(${selected.moodboard.length})` : ""}
                    </p>
                  </div>

                  {selected.moodboard && selected.moodboard.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selected.moodboard.map((r, idx) => (
                        <div key={idx} className="relative group rounded-lg border overflow-hidden bg-muted aspect-square">
                          {r.thumbnail_url || (r.url && isImageUrl(r.url)) ? (
                            <a href={r.url} target="_blank" rel="noreferrer" className="block h-full w-full">
                              <img
                                src={r.thumbnail_url || r.url}
                                alt={r.caption ?? "reference"}
                                loading="lazy"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const img = e.currentTarget as HTMLImageElement;
                                  img.style.display = "none";
                                  img.parentElement?.parentElement?.classList.add("p-2");
                                  const fb = img.parentElement?.querySelector("[data-fb]") as HTMLElement | null;
                                  if (fb) fb.style.display = "flex";
                                }}
                              />
                              <div
                                data-fb
                                className="absolute inset-0 hidden flex-col items-center justify-center text-[10px] text-muted-foreground p-2 text-center break-all"
                              >
                                <ExternalLink className="h-4 w-4 mb-1" />
                                {(() => { try { return new URL(r.url).hostname.replace("www.", ""); } catch { return r.url; } })()}
                              </div>
                            </a>
                          ) : (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="h-full w-full p-2 flex flex-col items-center justify-center text-[10px] text-muted-foreground text-center break-all"
                            >
                              <ExternalLink className="h-4 w-4 mb-1" />
                              {(() => { try { return new URL(r.url).hostname.replace("www.", ""); } catch { return r.url; } })()}
                            </a>
                          )}
                          {r.caption && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-1.5 py-1 truncate">
                              {r.caption}
                            </div>
                          )}
                          <button
                            onClick={() => removeReference(idx)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 border opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                            aria-label="Remove reference"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No references yet — add inspiration links or images below.</p>
                  )}

                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Paste image URL, Pinterest, IG, Behance link…"
                      value={newRefUrl}
                      onChange={(e) => setNewRefUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addReference(); } }}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={addReference} disabled={!newRefUrl.trim()} className="h-8 gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </div>

                {/* WIP upload (creative side) */}
                {selected.status !== "approved" && (
                  <div className="rounded-lg border-2 border-dashed p-4 text-center space-y-2">
                    <p className="text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Upload work for review
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Drop the deliverable here. It moves the card to <strong>Submitted</strong> and pings the client to approve.
                    </p>
                    <input
                      ref={wipInputRef}
                      type="file"
                      accept="image/*,application/pdf,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadWip(f);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => wipInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-1.5"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? "Uploading…" : "Choose file"}
                    </Button>
                  </div>
                )}

                {/* Review controls (client side) */}
                {(selected.status === "submitted" || selected.status === "in_progress") && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Review note (optional)</label>
                    <Textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="What needs changing? Or just 'looks great'."
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-end">
                  {selected.status === "submitted" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => advance(selected, "rejected", reviewNote)}
                        disabled={updating}
                        className="gap-1"
                      >
                        <XCircle className="h-4 w-4" /> Request changes
                      </Button>
                      <Button
                        onClick={() => advance(selected, "approved", reviewNote)}
                        disabled={updating}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                    </>
                  )}
                  {selected.status !== "submitted" && selected.status !== "approved" && NEXT_STATUS[selected.status as Status] && (
                    <Button
                      onClick={() => advance(selected, NEXT_STATUS[selected.status as Status]!)}
                      disabled={updating}
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                    >
                      Move to {COLUMNS.find((c) => c.key === NEXT_STATUS[selected.status as Status])?.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliverablesBoard;
