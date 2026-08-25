import { ArrowRight, Mic, FileText, ListChecks, Receipt } from "lucide-react";
import { CtaButton } from "@/components/ui/cta-button";
import { Button } from "@/components/ui/button";

interface StudioCreateHeroProps {
  onCreate: () => void;
  onVoice: () => void;
  /** Real count of the user's existing Projects — drives the supporting line only. */
  projectCount: number;
  activeCount: number;
}

const PROOF = [
  { icon: FileText, label: "Brief", copy: "Your idea, structured into a brief you can edit." },
  { icon: ListChecks, label: "Work", copy: "Tasks, deliverables and milestones in one place." },
  { icon: Receipt, label: "Wrap", copy: "Credits and an invoice draft when the work ends." },
];

/**
 * Studio home hero — creation-first. The promise, then one dominant
 * action. Copy stays inside what is actually live: Kreto drafts a
 * structure, the user reviews and confirms before anything is created.
 */
export const StudioCreateHero = ({ onCreate, onVoice, projectCount, activeCount }: StudioCreateHeroProps) => (
  <section
    aria-labelledby="studio-hero-title"
    className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 sm:p-9"
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
    />

    <div className="relative">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Studio</p>
      <h2
        id="studio-hero-title"
        className="mt-2 text-3xl sm:text-4xl font-black tracking-[-0.03em] text-foreground"
      >
        Turn an idea into a working Project.
      </h2>
      <p className="mt-3 max-w-xl text-sm sm:text-base text-muted-foreground">
        Tell Kreto what you're making — by voice or text. It shapes a brief and a starting
        structure, you review and edit it, and nothing is created until you confirm.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <CtaButton onClick={onCreate} data-testid="studio-create-project">
          Create a Project
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </CtaButton>
        <Button variant="outline" size="lg" onClick={onVoice} className="w-full sm:w-auto gap-2">
          <Mic className="h-4 w-4" aria-hidden />
          Describe it out loud
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {projectCount === 0
          ? "Your first Project takes about a minute to set up."
          : `${projectCount} Project${projectCount === 1 ? "" : "s"} in Studio · ${activeCount} in progress`}
      </p>

      <ul className="mt-7 grid gap-3 sm:grid-cols-3">
        {PROOF.map(({ icon: Icon, label, copy }) => (
          <li key={label} className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{copy}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default StudioCreateHero;
