import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, X, CalendarPlus, Briefcase, FolderPlus, Compass, LayoutDashboard, UserSearch, Wallet, Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { ScoutEventDialog } from "@/components/sessions/ScoutEventDialog";

interface QuickAction {
  id: string;
  label: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "lime" | "primary" | "muted";
  onSelect: () => void;
  hide?: boolean;
}

/**
 * Floating quick-action button anchored above the bottom nav.
 * Mobile-only (matches BottomNav). Tapping `+` opens a sheet of contextual
 * shortcuts that go straight to the right CTA dialog or page.
 */
const QuickActionFab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("quickFab.dismissed") === "1";
  });

  // Routes where the FAB always returns even after dismissal (primary surfaces)
  const isAutoShowRoute =
    location.pathname === "/" || location.pathname.startsWith("/circle");

  // Auto-restore visibility when user lands on Home or Match
  useEffect(() => {
    if (isAutoShowRoute && dismissed) {
      sessionStorage.removeItem("quickFab.dismissed");
      setDismissed(false);
    }
  }, [isAutoShowRoute, dismissed]);

  const dismissFab = () => {
    sessionStorage.setItem("quickFab.dismissed", "1");
    setDismissed(true);
    setOpen(false);
  };

  // Dialogs
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showPostGig, setShowPostGig] = useState(false);
  const [showScoutEvent, setShowScoutEvent] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.resolve(
      supabase
        .from("profiles")
        .select("account_type")
        .eq("user_id", user.id)
        .maybeSingle()
    )
      .then(({ data }) => setIsCompany(data?.account_type === "company"))
      .catch((err) => console.warn("[QuickActionFab] profile load failed:", err));
  }, [user?.id]);

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Hide on auth and other full-screen routes
  if (location.pathname === "/auth") return null;
  if (!user) return null;
  if (dismissed) return null;

  const close = () => setOpen(false);
  const go = (path: string) => {
    close();
    navigate(path);
  };

  const creatorActions: QuickAction[] = [
    {
      id: "host-event",
      label: "Host an event",
      sub: "Studio session, mixer, gathering",
      icon: CalendarPlus,
      tone: "lime",
      onSelect: () => {
        close();
        setShowCreateEvent(true);
      },
    },
    {
      id: "scout-event",
      label: "Scout an event",
      sub: "Saw a flyer or link? List it here",
      icon: Scan,
      tone: "primary",
      onSelect: () => {
        close();
        setShowScoutEvent(true);
      },
    },
    {
      id: "post-gig",
      label: "Post a gig",
      sub: "Hire, collab, or barter",
      icon: Briefcase,
      tone: "primary",
      onSelect: () => {
        close();
        setShowPostGig(true);
      },
    },
    {
      id: "new-project",
      label: "Start a project",
      sub: "Brief, contracts, files",
      icon: FolderPlus,
      tone: "primary",
      onSelect: () => {
        close();
        setShowCreateProject(true);
      },
    },
    {
      id: "find-project",
      label: "Find a gig",
      sub: "Browse opportunities",
      icon: Compass,
      tone: "muted",
      onSelect: () => go("/opportunities"),
    },
    {
      id: "manage-projects",
      label: "Manage projects",
      sub: "Open the Desk",
      icon: LayoutDashboard,
      tone: "muted",
      onSelect: () => go("/desk"),
    },
  ];

  const companyActions: QuickAction[] = [
    {
      id: "post-gig",
      label: "Post a gig",
      sub: "Hire creators or send a brief",
      icon: Briefcase,
      tone: "lime",
      onSelect: () => {
        close();
        setShowPostGig(true);
      },
    },
    {
      id: "find-talent",
      label: "Find talent",
      sub: "Smart Talent Finder",
      icon: UserSearch,
      tone: "primary",
      onSelect: () => go("/talent-finder"),
    },
    {
      id: "host-event",
      label: "Host an event",
      sub: "Activation, launch, mixer",
      icon: CalendarPlus,
      tone: "primary",
      onSelect: () => {
        close();
        setShowCreateEvent(true);
      },
    },
    {
      id: "scout-event",
      label: "Scout an event",
      sub: "Spotted one? List it for the host",
      icon: Scan,
      tone: "muted",
      onSelect: () => {
        close();
        setShowScoutEvent(true);
      },
    },
    {
      id: "new-project",
      label: "Start a project",
      sub: "Onboard a creator",
      icon: FolderPlus,
      tone: "muted",
      onSelect: () => {
        close();
        setShowCreateProject(true);
      },
    },
    {
      id: "thrivepay",
      label: "Send / request payment",
      sub: "ThrivePay",
      icon: Wallet,
      tone: "muted",
      onSelect: () => go("/thrivepay"),
    },
  ];

  const actions = (isCompany ? companyActions : creatorActions).filter((a) => !a.hide);

  // Bottom-nav height ≈ 64-72px + safe-area. We place the FAB ~80px above the bottom edge.
  const fabBottom = "calc(env(safe-area-inset-bottom, 0px) + 80px)";

  return (
    <>
      {/* Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close quick actions"
          onClick={close}
          className="fixed inset-0 z-[55] lg:hidden bg-background/70 animate-in fade-in duration-150"
        />
      )}

      {/* Action sheet */}
      {open && (
        <div
          ref={sheetRef}
          role="dialog"
          aria-label="Quick actions"
          className="fixed left-0 right-0 z-[56] lg:hidden px-4 animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + 150px)` }}
        >
          <div className="mx-auto max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/50">
              <div>
                <p className="text-sm font-semibold leading-tight">Quick actions</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Jump straight to it
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="py-1.5">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <button
                      onClick={a.onSelect}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 active:bg-muted transition-colors touch-manipulation"
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          a.tone === "lime" && "bg-energy/15 text-energy",
                          a.tone === "primary" && "bg-primary/15 text-primary",
                          a.tone === "muted" && "bg-muted text-foreground/80"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{a.label}</p>
                        {a.sub && (
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                            {a.sub}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* The FAB itself */}
      <div
        className="fixed right-4 z-[57] lg:hidden"
        style={{ bottom: fabBottom }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-expanded={open}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center",
            "bg-energy text-energy-foreground shadow-[0_8px_24px_-6px_hsl(var(--energy)/0.55)]",
            "border border-energy/40",
            "transition-transform duration-200 active:scale-95",
            open && "rotate-45"
          )}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>

        {/* Dismiss badge — hides the FAB until user lands on Home or Match */}
        {!open && (
          <button
            type="button"
            onClick={dismissFab}
            aria-label="Hide quick actions"
            className={cn(
              "absolute -top-1 -right-1 h-6 w-6 rounded-full",
              "bg-card text-foreground border border-border shadow-md",
              "flex items-center justify-center",
              "hover:bg-muted active:scale-95 transition-all touch-manipulation"
            )}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Mounted dialogs */}
      <CreateSessionDialog
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onCreated={() => navigate("/events/backstage")}
      />
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={() => {
          setShowCreateProject(false);
          navigate("/desk");
        }}
      />
      <PostOpportunityDialog
        open={showPostGig}
        onOpenChange={setShowPostGig}
      />
      <ScoutEventDialog
        open={showScoutEvent}
        onOpenChange={setShowScoutEvent}
      />
    </>
  );
};

export default QuickActionFab;
