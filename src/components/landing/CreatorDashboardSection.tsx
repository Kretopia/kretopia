import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Receipt, Mic, Search, ArrowRight, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * CreatorDashboardSection
 * Bento-grid showcase bridging Discovery → Daily Work on the landing page.
 * Dark, high-contrast, neon-accent aesthetic using semantic tokens.
 */
export const CreatorDashboardSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative my-10 sm:my-16">
      {/* Dark canvas */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[hsl(222_47%_6%)] text-white shadow-2xl">
        {/* Neon glow accents */}
        <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_60%)]" />

        <div className="relative px-5 py-10 sm:px-10 sm:py-16">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/90">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">The Creator Dashboard</span>
            </div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              The Business Side of Creativity,{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Automated.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              Stop managing projects in spreadsheets. Use the first Creative OS designed to plan, price, and get you paid.
            </p>
          </div>

          {/* Bento grid */}
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[1fr]">
            {/* Module 1 — ThriveDesk (large) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:col-span-3 md:row-span-2 hover:border-primary/40 transition-colors"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-80" />
              <div className="relative flex h-full flex-col">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80">
                  ThriveDesk · The Work Layer
                </p>
                <h3 className="mt-2 text-2xl font-bold sm:text-3xl">Custom Workspaces</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Whether it's a Photo Shoot or a Music Project, get a tailored desk with exactly the tools you need —
                  no more, no less.
                </p>

                {/* Mini visual */}
                <div className="mt-auto pt-6">
                  <div className="grid grid-cols-3 gap-2">
                    {["Photo", "Music", "Film"].map((label, i) => (
                      <div
                        key={label}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[11px] font-medium text-white/80"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Module 2 — ThriveQuote Copilot */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:col-span-3 hover:border-accent/40 transition-colors"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
              <div className="relative">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/40">
                  <Receipt className="h-5 w-5 text-accent" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-accent/90">
                  ThriveQuote Copilot · The Money Layer
                </p>
                <h3 className="mt-2 text-xl font-bold sm:text-2xl">Smart Invoicing</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Tell your co-pilot the project details. It calculates markups, writes professional descriptions, and
                  handles the dual-currency (USD/TTD) math for you.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-white/60">
                  <span className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10">USD $1,250</span>
                  <ArrowRight className="h-3 w-3 text-accent" />
                  <span className="rounded-md bg-accent/10 px-2 py-1 ring-1 ring-accent/30 text-accent">TTD 8,475</span>
                </div>
              </div>
            </motion.div>

            {/* Module 3 — Smart Briefs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:col-span-3 hover:border-primary/40 transition-colors"
            >
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80">
                  Smart Briefs · The Planning Layer
                </p>
                <h3 className="mt-2 text-xl font-bold sm:text-2xl">Voice-to-Task Workflow</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Turn a 30-second voice note into a full project roadmap with deliverables, deadlines, and contracts
                  automatically generated.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    Recording → Roadmap
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Free Tier Hook */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mx-auto mt-8 max-w-3xl rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-accent/15 p-5 sm:p-6"
          >
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white sm:text-base">Get started for free.</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/70 sm:text-sm">
                    2 Smart Tools per month on us. <span className="text-primary font-semibold">Unlimited for Creators.</span>
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
              >
                Start Free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Search Your Name hook (ties back to Discovery) */}
          <div className="mx-auto mt-8 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
              Already have credits? Claim them.
            </p>
            <form onSubmit={handleSearch} className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your name..."
                className="h-12 w-full rounded-full border-white/15 bg-white/[0.06] pl-11 pr-32 text-base text-white placeholder:text-white/40 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
              >
                Search
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
