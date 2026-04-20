import type { LucideIcon } from "lucide-react";
import { Inbox, Circle, CircleDot, Eye, CheckCircle2 } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by?: string | null;
  created_at: string;
  priority?: string | null;
  labels?: string[] | null;
}

export interface StatusDef {
  value: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** semantic dot color */
  dot: string;
  /** semantic surface tint */
  tint: string;
}

export const STATUSES: StatusDef[] = [
  { value: "backlog",     label: "Backlog",     short: "Backlog", icon: Inbox,         dot: "bg-muted-foreground",  tint: "bg-muted/40" },
  { value: "todo",        label: "To Do",       short: "Todo",    icon: Circle,        dot: "bg-foreground/60",     tint: "bg-card" },
  { value: "in_progress", label: "In Progress", short: "Doing",   icon: CircleDot,     dot: "bg-primary",           tint: "bg-primary/5" },
  { value: "review",      label: "Review",      short: "Review",  icon: Eye,           dot: "bg-amber-500",         tint: "bg-amber-500/5" },
  { value: "done",        label: "Done",        short: "Done",    icon: CheckCircle2,  dot: "bg-emerald-500",       tint: "bg-emerald-500/5" },
];

export const PRIORITIES: { value: string; label: string; chip: string }[] = [
  { value: "low",    label: "Low",    chip: "bg-muted text-muted-foreground border-border" },
  { value: "normal", label: "Normal", chip: "bg-primary/10 text-primary border-primary/20" },
  { value: "high",   label: "High",   chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { value: "urgent", label: "Urgent", chip: "bg-destructive/15 text-destructive border-destructive/30" },
];

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isOverdue = (due: string | null | undefined) => {
  if (!due) return false;
  return new Date(due).getTime() < startOfToday().getTime();
};

export const isDueToday = (due: string | null | undefined) => {
  if (!due) return false;
  const d = new Date(due);
  const t = startOfToday();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

export const formatDue = (due: string | null | undefined) => {
  if (!due) return null;
  const d = new Date(due);
  if (isOverdue(due)) return "Overdue";
  if (isDueToday(due)) return "Today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const getStatusDef = (status: string) =>
  STATUSES.find(s => s.value === status) ?? STATUSES[1];

export const getPriorityDef = (priority: string | null | undefined) =>
  PRIORITIES.find(p => p.value === (priority || "normal")) ?? PRIORITIES[1];

export const getInitials = (name?: string | null) =>
  (name || "?").split(/\s+/).map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);