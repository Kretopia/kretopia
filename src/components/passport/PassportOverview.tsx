import { Shield, Users, Briefcase, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PassportOverviewProps {
  stamps: number;
  connections: number;
  projects: number;
  cosigns: number;
  className?: string;
}

/**
 * PassportOverview — 4 compact trust cards under the Passport header.
 * Replaces dashboard/analytics clutter. Public-facing only: who is this,
 * what have they done, can I trust them.
 */
export function PassportOverview({
  stamps,
  connections,
  projects,
  cosigns,
  className,
}: PassportOverviewProps) {
  const navigate = useNavigate();

  const cards = [
    { key: "stamps",      label: "Stamps",      value: stamps,      icon: Shield,    to: "/credits",       teal: true },
    { key: "connections", label: "Connections", value: connections, icon: Users,     to: "/circle?tab=network" },
    { key: "projects",    label: "Projects",    value: projects,    icon: Briefcase, to: "/desk" },
    { key: "cosigns",     label: "Co-signs",    value: cosigns,     icon: Award,     to: "/profile#hire" },
  ] as const;

  return (
    <div className={cn("grid grid-cols-4 gap-1.5 sm:gap-2", className)}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              if (c.to.startsWith("/profile#")) {
                const id = c.to.split("#")[1];
                const el = document.getElementById(id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  history.replaceState(null, "", c.to);
                  return;
                }
              }
              navigate(c.to);
            }}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border bg-card px-2.5 py-2.5 text-left transition-colors",
              "hover:bg-foreground/[0.03] border-border"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5",
                c.teal ? "text-[hsl(var(--signal-teal))]" : "text-muted-foreground"
              )}
            />
            <div className="text-lg sm:text-xl font-black leading-none tracking-tight">{value(c.value)}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
              {c.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function value(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default PassportOverview;
