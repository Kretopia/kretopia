import { memo } from "react";
import { MessageSquare, CheckSquare, FolderOpen, LayoutGrid, CheckCircle2, Wallet, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export const DESK_TABS = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "approvals", label: "Approvals", icon: CheckCircle2 },
  { id: "scope", label: "Scope AI", icon: Shield },
  { id: "finance", label: "Finance", icon: Wallet },
] as const;

export type DeskTabId = (typeof DESK_TABS)[number]["id"] | "notes" | "templates" | "ai" | "assets";

interface DeskTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DeskTabBar = memo(({ activeTab, onTabChange }: DeskTabBarProps) => (
  <div className="border-b border-border bg-card/50 px-4 shrink-0">
    <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
      {DESK_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  </div>
));

DeskTabBar.displayName = "DeskTabBar";
