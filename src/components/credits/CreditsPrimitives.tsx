import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Shared shell + state primitives for the Credits dashboard.
 *
 * Typography note: nothing here declares a font-family. Every panel inherits
 * the single brand family from the global cascade — hierarchy is expressed
 * through size and weight only (H1 > H2 > H3 > body > metadata).
 */

const EASE = [0.2, 0.65, 0.3, 0.95] as const;

export function DashboardPanel({
  id,
  title,
  eyebrow,
  action,
  children,
  className,
  index = 0,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduced ? 0 : 0.45, ease: EASE, delay: reduced ? 0 : Math.min(index * 0.06, 0.24) }}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6",
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{eyebrow}</p>
          )}
          <h2 id={id ? `${id}-heading` : undefined} className="text-lg font-semibold tracking-tight text-white">
            {title}
          </h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </motion.section>
  );
}

export function CreditsEmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.015] px-5 py-8 text-center">
      {icon && <div className="mb-3 flex justify-center text-white/35">{icon}</div>}
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/55">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function CreditsPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your credits…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

export function CreditsErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-6 text-center">
      <p className="text-sm font-medium text-white">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}
