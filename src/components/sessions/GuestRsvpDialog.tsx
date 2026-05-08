import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  guest_name: z.string().trim().min(1, "Name required").max(100),
  guest_email: z.string().trim().email("Invalid email").max(255),
});

interface CustomQuestion {
  id: string;
  question: string;
  question_type: string;
  required: boolean;
  options: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  eventTitle: string;
  onRsvpComplete?: () => void;
}

export const GuestRsvpDialog = ({ open, onOpenChange, eventId, eventTitle, onRsvpComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ guest_name?: string; guest_email?: string }>({});
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!open || !eventId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("event_rsvp_questions")
        .select("id, question, question_type, required, options")
        .eq("event_id", eventId)
        .order("position", { ascending: true });
      setQuestions((data || []).map((d: any) => ({ ...d, options: Array.isArray(d.options) ? d.options : [] })));
    })().catch(() => {});
  }, [open, eventId]);

  const setAnswer = (id: string, value: any) => setAnswers(prev => ({ ...prev, [id]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ guest_name: name, guest_email: email });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({ guest_name: fe.guest_name?.[0], guest_email: fe.guest_email?.[0] });
      return;
    }

    // Validate required custom questions
    for (const q of questions) {
      if (q.required) {
        const a = answers[q.id];
        const isEmpty = a === undefined || a === null || a === "" || (Array.isArray(a) && a.length === 0);
        if (isEmpty) {
          toast({ title: "Missing answer", description: `"${q.question}" is required`, variant: "destructive" });
          return;
        }
      }
    }

    setLoading(true);
    try {
      if (user) {
        await supabase.from("jam_participants").upsert(
          { jam_id: eventId, user_id: user.id, status: "going" },
          { onConflict: "jam_id,user_id" }
        );
      } else {
        const { error } = await supabase
          .from("guest_rsvps")
          .upsert(
            { event_id: eventId, guest_name: parsed.data.guest_name, guest_email: parsed.data.guest_email, status: "going" },
            { onConflict: "event_id,guest_email" }
          );
        if (error) throw error;
      }

      // Save answers (best-effort)
      const answerRows = Object.entries(answers)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
        .map(([qid, v]) => ({
          event_id: eventId,
          question_id: qid,
          user_id: user?.id ?? null,
          guest_email: user ? null : parsed.data.guest_email,
          answer: { value: v },
        }));
      if (answerRows.length > 0) {
        await (supabase as any).from("event_rsvp_answers").insert(answerRows);
      }

      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "event-registration-confirmation",
          recipientEmail: parsed.data.guest_email,
          idempotencyKey: `guest-rsvp-${eventId}-${parsed.data.guest_email}`,
          templateData: {
            attendeeName: parsed.data.guest_name,
            attendeeEmail: parsed.data.guest_email,
            eventTitle,
            eventUrl: `${window.location.origin}/event/${eventId}`,
            isGuest: !user,
          },
        },
      }).catch(() => {});

      onOpenChange(false);
      onRsvpComplete?.();
      navigate(`/event/${eventId}/confirmed?name=${encodeURIComponent(parsed.data.guest_name)}&email=${encodeURIComponent(parsed.data.guest_email)}`);
    } catch (err: any) {
      toast({ title: "Couldn't RSVP", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (q: CustomQuestion) => {
    const v = answers[q.id];
    switch (q.question_type) {
      case "long_text":
      case "meet_intent":
        return (
          <textarea
            className="w-full min-h-[72px] rounded-md border bg-background p-2 text-sm"
            value={v || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            maxLength={1000}
          />
        );
      case "single_select":
        return (
          <div className="space-y-1.5">
            {q.options.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name={q.id} checked={v === opt} onChange={() => setAnswer(q.id, opt)} />
                {opt}
              </label>
            ))}
          </div>
        );
      case "multi_select":
        return (
          <div className="space-y-1.5">
            {q.options.map(opt => {
              const arr: string[] = Array.isArray(v) ? v : [];
              const checked = arr.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => {
                      const next = checked ? arr.filter(x => x !== opt) : [...arr, opt];
                      setAnswer(q.id, next);
                    }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );
      default:
        return (
          <Input value={v || ""} onChange={(e) => setAnswer(q.id, e.target.value)} maxLength={500} />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Reserve your spot</DialogTitle>
          <DialogDescription>
            Quick RSVP for <span className="font-medium text-foreground">{eventTitle}</span>. No account needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Full name</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
              error={!!errors.guest_name}
              maxLength={100}
            />
            {errors.guest_name && <p className="text-xs text-destructive">{errors.guest_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-email">Email</Label>
            <Input
              id="guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              error={!!errors.guest_email}
              maxLength={255}
            />
            {errors.guest_email && <p className="text-xs text-destructive">{errors.guest_email}</p>}
          </div>

          {questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label>
                {q.question}
                {q.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderQuestion(q)}
            </div>
          ))}

          <Button type="submit" variant="gradient" className="w-full py-6 text-base" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <><Sparkles className="h-4 w-4 mr-2" /> Confirm RSVP</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
