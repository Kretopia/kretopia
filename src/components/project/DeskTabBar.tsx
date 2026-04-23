import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  resolveTabs,
  TAB_META,
  getTabLabel,
  type WorkspaceType,
  type DealType,
  type DeskTabKey,
} from "@/lib/workspaceConfigs";

// Legacy export kept for any consumers still importing DESK_TABS
export const DESK_TABS = [
  { id: "today", label: "Today" },
  { id: "messages", label: "Chat" },
  { id: "tasks", label: "Tasks" },
  { id: "files", label: "Files" },
  { id: "notes", label: "Notes" },
] as const;

export type DeskTabId = DeskTabKey;

interface DeskTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  taskCount?: number;
  messageCount?: number;
  workspaceType?: WorkspaceType | null;
  dealType?: DealType | null;
}

export const DeskTabBar = memo(({ activeTab, onTabChange, taskCount, messageCount, workspaceType, dealType }: DeskTabBarProps) => {
  const tabs = useMemo<DeskTabKey[]>(
    () => resolveTabs((workspaceType ?? "general") as WorkspaceType, (dealType ?? "paid") as DealType),
    [workspaceType, dealType]
  );

  return (
    <div className="border-b border-border bg-card/50 px-4 shrink-0">
      <nav className="flex gap-0.5 overflow-x-auto scrollbar-hide -mb-px">
        {tabs.map((tabId) => {
          const meta = TAB_META[tabId];
          if (!meta) return null;
          const Icon = meta.icon;
          const label = getTabLabel(tabId, (workspaceType ?? "general") as WorkspaceType);
          const count = tabId === "tasks" ? taskCount : tabId === "messages" ? messageCount : undefined;
          const active = activeTab === tabId;
          return (
            <button
              key={tabId}
              onClick={() => onTabChange(tabId)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && !active && (
                <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
});

DeskTabBar.displayName = "DeskTabBar";
