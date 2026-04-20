import { memo } from "react";
import { Sparkles, MessageSquare, CheckSquare, FolderOpen, LayoutGrid, CheckCircle2, Wallet, Shield, FileSignature, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export const DESK_TABS = [
  { id: "today", label: "Today", icon: Sparkles, accent: true },
  { id: "messages", label: "Chat", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "contracts", label: "Contracts", icon: FileSignature },
  { id: "approvals", label: "Approvals", icon: CheckCircle2 },
  { id: "finance", label: "Finance", icon: Wallet },
] as const;

export type DeskTabId = (typeof DESK_TABS)[number]["id"] | "notes" | "templates" | "ai" | "assets";

interface DeskTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  taskCount?: number;
  messageCount?: number;
}

export const DeskTabBar = memo(({ activeTab, onTabChange, taskCount, messageCount }: DeskTabBarProps) => (
  <div className="border-b border-border bg-card/50 px-4 shrink-0">
    <nav className="flex gap-0.5 overflow-x-auto scrollbar-hide -mb-px">
      {DESK_TABS.map((tab) => {
        const Icon = tab.icon;
        const count = tab.id === "tasks" ? taskCount : tab.id === "messages" ? messageCount : undefined;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {count !== undefined && count > 0 && activeTab !== tab.id && (
              <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  </div>
));

DeskTabBar.displayName = "DeskTabBar";
