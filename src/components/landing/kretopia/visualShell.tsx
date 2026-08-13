/**
 * VisualCardShell — shared chrome for every feature's large, step-reactive
 * visual preview inside FeatureTutorialPanel. One consistent frame (header +
 * content + optional footer) so all nine previews read as one system
 * instead of nine different card styles.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const ACCENT = "#FF2DA1";

interface VisualCardShellProps {
  icon: LucideIcon;
  label: string;
  tag?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const VisualCardShell = ({ icon: Icon, label, tag, children, footer }: VisualCardShellProps) => (
  <div
    className="relative h-full rounded-2xl overflow-hidden"
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 30px 80px -40px rgba(255,45,161,0.35)",
    }}
  >
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: "rgba(255,45,161,0.14)" }}
      >
        <Icon className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-white" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
          {label}
        </p>
        {tag && (
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/35" style={{ fontFamily: "'Work Sans', sans-serif" }}>
            {tag}
          </p>
        )}
      </div>
    </div>

    <div className="px-5 py-9 sm:px-7 min-h-[360px] flex flex-col justify-center gap-5">
      {children}
    </div>

    {footer && (
      <div className="px-5 py-4 sm:px-7" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {footer}
      </div>
    )}
  </div>
);

export default VisualCardShell;
