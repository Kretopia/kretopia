import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ClaimedCredit, DraftProfile } from "./types";

interface Props {
  query: string;
  selectedCredits: ClaimedCredit[];
  onBack: () => void;
  onConfirm: (profile: DraftProfile, credits: ClaimedCredit[]) => void;
}

/** Step 3: live read-only profile preview, edit/remove anything. */
export const ProfilePreviewStep = ({ query, selectedCredits, onBack, onConfirm }: Props) => {
  const [building, setBuilding] = useState(true);
  const [profile, setProfile] = useState<DraftProfile>({});
  const [credits, setCredits] = useState<ClaimedCredit[]>(selectedCredits);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Use ai-autofill-profile (extractive, web-grounded, no fabrication).
        const inferredName =
          /^[A-Z][a-z]+ [A-Z][a-z]+/.test(query) ? query : selectedCredits[0]?.role_suggestion?.split(" ").slice(-2).join(" ") || query;
        const url = selectedCredits.find((c) => c.url && /^https?:\/\//.test(c.url))?.url;
        const { data } = await supabase.functions.invoke("ai-autofill-profile", {
          body: { full_name: inferredName, url, current_role: selectedCredits[0]?.role_suggestion },
        });
        if (cancelled) return;
        const p = data?.profile || {};
        setProfile({
          full_name: inferredName,
          role: p.role || selectedCredits[0]?.role_suggestion || "",
          bio: p.bio || "",
          location: p.location || selectedCredits[0]?.location || "",
          skills: Array.isArray(p.skills) ? p.skills.slice(0, 6) : [],
          avatar_url: p.avatar_url || undefined,
          website: p.website || url || undefined,
        });
      } catch (e) {
        console.warn("[ClaimFlow] enrichment soft-failed", e);
        setProfile({ full_name: query, role: selectedCredits[0]?.role_suggestion || "" });
      } finally {
        if (!cancelled) setBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, selectedCredits]);

  const removeCredit = (id: string) => setCredits((prev) => prev.filter((c) => c._id !== id));

  if (building) {
    return (
      <div className="py-12 space-y-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <div className="space-y-1">
          <p className="font-semibold">Building your profile…</p>
          <p className="text-xs text-muted-foreground">
            Verifying credits · Pulling avatar · Extracting bio
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Your profile preview
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            <AvatarFallback>{profile.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            {editingName ? (
              <Input
                value={profile.full_name || ""}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                onBlur={() => setEditingName(false)}
                autoFocus
                className="h-8 text-base font-bold"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-left font-bold text-lg leading-tight hover:underline decoration-dotted"
              >
                {profile.full_name || "Your name"}
              </button>
            )}
            <Input
              value={profile.role || ""}
              onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
              placeholder="Your role (e.g. Director, Producer, Designer)"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Bio</Label>
          <Textarea
            value={profile.bio || ""}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Add a short professional bio…"
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {profile.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Credits */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {credits.length} verified credit{credits.length === 1 ? "" : "s"}
        </p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {credits.map((c) => (
            <div
              key={c._id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-2"
            >
              {c.thumbnail ? (
                <img src={c.thumbnail} className="h-10 w-10 rounded object-cover shrink-0" alt="" />
              ) : (
                <div className="h-10 w-10 rounded bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{c.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {c.role_suggestion || "Credit"}
                  {c.year ? ` · ${c.year}` : ""}
                </p>
              </div>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="View source"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => removeCredit(c._id)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Remove credit"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {credits.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1">
              No credits — you can add them later from your profile.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => onConfirm(profile, credits)}
          disabled={!profile.full_name?.trim()}
          className="flex-1"
          size="lg"
        >
          Looks good — save it
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
