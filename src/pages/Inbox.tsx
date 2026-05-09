import { lazy, Suspense } from "react";
import { SEO } from "@/components/SEO";
import { ApprovalsHub } from "@/components/agent/ApprovalsHub";
import { Loader2 } from "lucide-react";

const NotificationsPage = lazy(() => import("./Notifications"));

/**
 * Unified Inbox — the single place where things "wait for you":
 *  - Approvals Hub (Thrive's drafts + queued actions)
 *  - Notifications feed (matches, messages, project events…)
 *
 * Replaces the scattered "Waiting on you / Notifications / Outbox" surfaces
 * with one canonical destination so the user never wonders where a pending
 * thing landed.
 */
const Inbox = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Inbox - ThriveIN" description="Approvals and notifications in one place" />
      <div className="container mx-auto max-w-2xl px-4 pt-6">
        <ApprovalsHub limit={6} />
      </div>
      <Suspense fallback={
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }>
        <NotificationsPage />
      </Suspense>
    </div>
  );
};

export default Inbox;
