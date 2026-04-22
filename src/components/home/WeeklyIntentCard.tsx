import { useEffect, useState } from "react";
import { Sparkles, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { IntentPicker } from "@/components/intent/IntentPicker";
import { intentMeta, type PrimaryIntent } from "@/lib/intents";
import { useToast } from "@/hooks/use-toast";

/**
 * Weekly intent refresh — appears on Home if the user hasn't picked
 * (or refreshed) their focus this calendar week. Lets them re-pick
 * what they're here to do this week.
 */
export const WeeklyIntentCard = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState<PrimaryIntent | null>(null);
  const [saving, setSaving] = useState(false);

  // Monday of current week as YYYY-MM-DD
  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("primary_intent, intent_week_start")
          .eq("user_id", user.id)
          .maybeSingle();

        const intent = (data as any)?.primary_intent as PrimaryIntent | null;
        const lastWeek = (data as any)?.intent_week_start as string | null;
        setCurrent(intent ?? null);

        // Show prompt when: never picked, OR week has changed
        if (!intent || lastWeek !== weekStart) {
          setShow(true);
          if (!intent) setEditing(true);
        }
      } catch (e) {
        console.error("[WeeklyIntentCard]", e);
      }
    };
    load().catch((e) => console.error("[WeeklyIntentCard] load", e));
  }, [user, weekStart]);

  const save = async (intent: PrimaryIntent) => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          primary_intent: intent,
          intent_set_at: new Date().toISOString(),
          intent_week_start: weekStart,
        } as any)
        .eq("user_id", user.id);
      setCurrent(intent);
      setEditing(false);
      const meta = intentMeta(intent);
      toast({
        title: `Locked in: ${meta?.label}`,
        description: "We'll tune your home and nudges around this.",
      });
    } catch (e) {
      console.error("[WeeklyIntentCard] save", e);
      toast({ title: "Couldn't save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !show) return null;

  const meta = intentMeta(current);

  return (
    <div
      className={`relative rounded-2xl border border-energy/30 bg-gradient-to-br from-energy/[0.06] via-card to-primary/[0.05] p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-energy/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-energy" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">
              {editing ? "What are you here to do?" : "Your focus this week"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {editing ? "Pick one — we'll tune your home around it." : "Tap to switch any time."}
            </p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" /> Change
          </button>
        )}
      </div>

      {editing ? (
        <IntentPicker value={current ?? undefined} onChange={save} compact />
      ) : meta ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 hover:bg-primary/15 transition-colors text-left"
        >
          <span className="text-xl" aria-hidden>{meta.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">{meta.label}</p>
            <p className="text-[11px] text-muted-foreground truncate">{meta.blurb}</p>
          </div>
        </button>
      ) : null}

      {saving && <p className="text-[10px] text-muted-foreground mt-2">Saving…</p>}
    </div>
  );
};
