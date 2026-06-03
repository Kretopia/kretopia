import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Image as ImageIcon, DollarSign, Film } from "lucide-react";

interface Props {
  projectId: string;
}

const QUICK = [
  { intent: "client_proposal", label: "Client proposal", icon: FileText },
  { intent: "sponsor_deck", label: "Sponsor deck", icon: DollarSign },
  { intent: "treatment", label: "Treatment", icon: Film },
  { intent: "moodboard_deck", label: "Moodboard", icon: ImageIcon },
];

/**
 * Entry point inside a Studio that opens Thrive's Executive Producer.
 * One-tap to a specific doc type, or open the generator.
 */
export function ThriveGenerateCard({ projectId }: Props) {
  const navigate = useNavigate();
  const go = (intent?: string) =>
    navigate(`/desk/${projectId}/thrive/generate${intent ? `?intent=${intent}` : ""}`);

  return (
    <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">Executive Producer</div>
          <h3 className="text-sm font-semibold mt-0.5">Need a deck, proposal, or treatment?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Thrive drafts it from this Studio's brief, your credits, and your rates.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q.intent}
            onClick={() => go(q.intent)}
            className="flex items-center gap-1.5 text-xs p-2 rounded-md border border-border bg-background hover:border-primary/50 transition"
          >
            <q.icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{q.label}</span>
          </button>
        ))}
      </div>

      <Button size="sm" variant="ghost" className="w-full mt-2 text-xs h-8" onClick={() => go()}>
        Open generator →
      </Button>
    </Card>
  );
}
