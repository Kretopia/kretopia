/**
 * VisualCardShell — shared chrome for every feature's visual preview:
 * the same header treatment (icon + label + optional "illustrative" tag)
 * used by the Verified Credits and Kreto mockups, so all 9 previews read
 * as one system instead of nine different card styles.
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
    className="rounded-2xl overflow-hidden"
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 30px 80px -40px rgba(255,45,161,0.35)",
    }}
  >
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: "rgba(255,45,161,0.14)" }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: ACCENT }} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
          {label}
        </p>
        {tag && (
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/35" style={{ fontFamily: "'Work Sans', sans-serif" }}>
            {tag}
          </p>
        )}
      </div>
    </div>

    <div className="px-4 py-6 min-h-[220px] flex flex-col justify-center gap-4">
      {children}
    </div>

    {footer && (
      <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {footer}
      </div>
    )}
  </div>
);

export default VisualCardShell;
