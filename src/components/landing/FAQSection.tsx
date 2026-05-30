import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Crawlable, text-based FAQ for AI-search citation (ChatGPT, Perplexity, Claude)
 * and Google FAQ-rich results. Mirrors the FAQPage JSON-LD in index.html.
 */
const FAQS = [
  {
    q: "What is ThriveIN.io?",
    intro:
      "ThriveIN.io is the Creative OS — an all-in-one professional network, portfolio builder, and workspace for artists, musicians, filmmakers, producers, and models.",
    points: [
      "A verified credit registry for every creative industry (film, music, fashion, events, design)",
      "An auto-generated industry EPK at a custom URL (thrivein.io/your-name)",
      "ThriveDesk — a collaborative workspace with task boards, files, chat, and calls",
      "Built-in milestone payments and escrow so creatives get paid safely",
    ],
  },
  {
    q: "How does the creative credit tracking system work?",
    intro:
      "ThriveIN's credit system gives creatives a verifiable record of every project they've worked on:",
    points: [
      "Search any production, album, campaign, event, or release in the registry",
      "Claim your role on it (director, producer, photographer, musician, model, designer, etc.)",
      "Collaborators co-sign your credit, which verifies authorship peer-to-peer",
      "ThriveIN cross-references public records and platform data to issue a verified badge",
      "The result is an un-falsifiable, portable work history — like IMDb, but for every creative industry",
    ],
  },
  {
    q: "What is an Industry EPK on ThriveIN?",
    intro:
      "An Industry EPK (Electronic Press Kit) is a professional, link-ready profile that ThriveIN generates automatically from your account:",
    points: [
      "Custom URL — thrivein.io/your-name — ready to share with clients, agents, labels, festivals, or casting directors",
      "Pulls in your verified credits, portfolio media, rate card, reviews, and contact info",
      "Always up to date — when you add a new credit or project, your EPK updates instantly",
      "Mobile-first design that looks professional whether opened on phone, desktop, or shared in DMs",
    ],
  },
  {
    q: "How do milestone payments protect freelance creatives?",
    intro:
      "ThriveIN's milestone payments replace the 'invoice and hope' model freelance creatives usually face:",
    points: [
      "Client funds are held in protected escrow before the project starts — no more starting work unpaid",
      "Funds release automatically as each agreed milestone (script, edit, delivery, final cut) is approved",
      "Built-in contracts and deliverable checkpoints reduce scope-creep and ghosting",
      "Disputes go through a structured review process rather than chasing clients over email",
      "Both creatives and clients have a clear, auditable trail of what was agreed and paid",
    ],
  },
];

export const FAQSection = () => {
  return (
    <section
      aria-labelledby="faq-heading"
      className="relative py-16 sm:py-24 bg-muted/30 border-t border-border"
    >
      <div className="container mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-energy mb-4">
            Frequently asked
          </p>
          <h2
            id="faq-heading"
            className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.05]"
          >
            Everything about the Creative OS
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Straight answers about credits, EPKs, and getting paid on ThriveIN.io.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden"
        >
          {FAQS.map(({ q, intro, points }, i) => (
            <AccordionItem
              key={q}
              value={`item-${i}`}
              className="border-b-0 px-5 sm:px-6"
            >
              <AccordionTrigger className="text-left text-base sm:text-lg font-bold text-foreground hover:no-underline py-5">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-6">
                <p className="mb-3">{intro}</p>
                <ul className="space-y-2">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                      />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
